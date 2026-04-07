import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { getJikanDetails, searchJikan } from '@/lib/jikan';
import { generateShortId } from '@/lib/id';
import { z } from 'zod';
import type { ContentType, Prisma } from '@prisma/client';
import { buildGenreNames } from '@/lib/genres';

const ensureSchema = z
  .object({
    tmdbId: z.number().int().optional(),
    malId: z.number().int().optional(),
    contentType: z.enum(['MOVIE', 'TV_SHOW', 'ANIME']),
  })
  .refine((data) => data.tmdbId || data.malId, {
    message: 'Either tmdbId or malId must be provided',
  });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = ensureSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { tmdbId, malId, contentType } = parsed.data;

    // 1. Check if already exists by TMDB ID
    if (tmdbId) {
      const existing = await prisma.content.findUnique({ where: { tmdbId } });
      if (existing) return NextResponse.json({ amdbId: existing.id });
    }

    // 2. Check if already exists by MAL ID (mainly for Anime)
    if (malId) {
      const existing = await prisma.content.findUnique({ where: { malId } });
      if (existing) return NextResponse.json({ amdbId: existing.id });
    }

    // 3. Create record if it doesn't exist
    let contentData: any = {};

    if (tmdbId) {
      // Fetch from TMDB
      const raw =
        contentType === 'TV_SHOW' || contentType === 'ANIME'
          ? await tmdb.tvDetails(tmdbId)
          : await tmdb.movieDetails(tmdbId);

      contentData = {
        contentType: contentType as ContentType,
        title: raw.title ?? raw.name ?? '',
        originalTitle: raw.original_title ?? raw.original_name ?? null,
        year: raw.release_date
          ? new Date(raw.release_date).getFullYear()
          : raw.first_air_date
            ? new Date(raw.first_air_date).getFullYear()
            : null,
        posterUrl: tmdbImageUrl(raw.poster_path),
        backdropUrl: tmdbImageUrl(raw.backdrop_path, 'w1280'),
        overview: raw.overview,
        tagline: raw.tagline ?? null,
        genres: raw.genres ?? [],
        runtimeMins: raw.runtime ?? null,
        status: raw.status ?? null,
        tmdbId: raw.id,
        imdbId: (raw as any).imdb_id ?? (raw as any).external_ids?.imdb_id ?? null,
        tmdbRating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : null,
        tmdbVoteCount: raw.vote_count ?? null,
        genreNames: buildGenreNames(raw.genres),
      };

      // Handle age certification
      if (contentType === 'MOVIE') {
        const usEntry = raw.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
        contentData.ageCertification =
          usEntry?.release_dates?.find((d: any) => d.certification)?.certification ?? null;
      } else {
        const usRating = raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
        contentData.ageCertification = usRating?.rating ?? null;
      }
    } else if (malId && contentType === 'ANIME') {
      // Fetch exclusively from Jikan (MAL-only title)
      const raw = await getJikanDetails(malId);
      contentData = {
        contentType: 'ANIME' as ContentType,
        title: raw.title_english ?? raw.title ?? '',
        originalTitle: raw.title ?? null,
        year: raw.year ?? (raw.aired?.from ? new Date(raw.aired.from).getFullYear() : null),
        posterUrl: raw.images.jpg.large_image_url,
        backdropUrl: null,
        overview: raw.synopsis,
        tagline: null,
        genres: raw.genres.map((g) => ({ id: g.mal_id, name: g.name })),
        runtimeMins: typeof raw.duration === 'number' ? raw.duration : null,
        status: raw.status,
        malId: raw.mal_id,
        tmdbRating: raw.score,
        genreNames: buildGenreNames(raw.genres),
      };
    }

    const content = await prisma.content.create({
      data: {
        ...contentData,
        id: generateShortId(),
      },
    });

    // ── Post-creation Enrichments ──

    // 1. If we have a TMDB ID for an anime, try to find its MAL ID
    if (tmdbId && contentType === 'ANIME' && !content.malId) {
      try {
        const title = content.title;
        const jikanSearch = await searchJikan(title);
        const match =
          jikanSearch.results.find((r: any) => r.title.toLowerCase() === title.toLowerCase()) ??
          jikanSearch.results[0];

        if (match?.malId) {
          await prisma.content.update({
            where: { id: content.id },
            data: { malId: match.malId },
          });
          const jikanData = await getJikanDetails(match.malId);
          await prisma.contentEnrichment.upsert({
            where: { contentId_source: { contentId: content.id, source: 'jikan' } },
            create: { contentId: content.id, source: 'jikan', data: jikanData as any },
            update: { data: jikanData as any, fetchedAt: new Date() },
          });
        }
      } catch (e) {
        console.error('Jikan enrichment error in ensure:', e);
      }
    }

    // 2. If we just created from MAL ID, store the Jikan data immediately as enrichment
    if (!tmdbId && malId && contentData.contentType === 'ANIME') {
      try {
        const jikanData = await getJikanDetails(malId);
        await prisma.contentEnrichment.upsert({
          where: { contentId_source: { contentId: content.id, source: 'jikan' } },
          create: { contentId: content.id, source: 'jikan', data: jikanData as any },
          update: { data: jikanData as any, fetchedAt: new Date() },
        });
      } catch (e) {
        console.error('Jikan direct enrichment error in ensure:', e);
      }
    }

    // 3. OMDB enrichment if we have an IMDB ID
    if (contentData.imdbId && process.env.OMDB_API_KEY) {
      try {
        const omdbRes = await fetch(
          `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${contentData.imdbId}`,
        );
        if (omdbRes.ok) {
          const omdbData = await omdbRes.json();
          if (omdbData.Response === 'True') {
            await prisma.contentEnrichment.upsert({
              where: { contentId_source: { contentId: content.id, source: 'omdb' } },
              create: { contentId: content.id, source: 'omdb', data: omdbData },
              update: { data: omdbData, fetchedAt: new Date() },
            });
          }
        }
      } catch (e) {
        console.error('OMDB enrichment error in ensure:', e);
      }
    }

    return NextResponse.json({ amdbId: content.id });
  } catch (err) {
    console.error('Ensure content error:', err);
    return NextResponse.json({ error: 'Failed to ensure content' }, { status: 500 });
  }
}
