import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { getJikanDetails } from '@/lib/jikan';
import { z } from 'zod';
import type { ContentType, Prisma, WatchStatus } from '@prisma/client';

type WatchStatusValue = WatchStatus;

const SORT_FIELDS = ['addedAt', 'userRating', 'tmdbRating', 'title', 'year'] as const;
type SortField = (typeof SORT_FIELDS)[number];

const addSchema = z.object({
  profileId: z.string().cuid(),
  tmdbId: z.number().int().positive(),
  contentType: z.enum(['MOVIE', 'TV_SHOW', 'ANIME']),
  userRating: z.number().int().min(1).max(10),
  notes: z.string().max(500).optional(),
  // Movie-only
  watchedDate: z.string().datetime().optional(),
  // TV/Anime-only
  watchStatus: z.enum(['WATCHING', 'PLAN_TO_WATCH', 'COMPLETED', 'DROPPED']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  episodeCount: z.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const profileId = searchParams.get('profileId');
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const limit = 24;

  // Sort params
  const sortBy = (searchParams.get('sortBy') ?? 'addedAt') as SortField;
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';

  // Filter params
  const contentType = searchParams.get('contentType'); // MOVIE | TV_SHOW | ANIME | null = all
  const minRating = Number(searchParams.get('minRating') ?? '1');
  const maxRating = Number(searchParams.get('maxRating') ?? '10');
  const watchStatus = searchParams.get('watchStatus'); // comma-separated
  const genres = searchParams.get('genres'); // comma-separated genre names

  if (!profileId) return NextResponse.json({ error: 'profileId required' }, { status: 400 });

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Build where clause
  const where: Prisma.UserContentWhereInput = {
    profileId,
    userRating: { gte: minRating, lte: maxRating },
    ...(watchStatus && watchStatus !== '' && {
      watchStatus: { in: watchStatus.split(',') as WatchStatusValue[] },
    }),
    content: {
      ...(contentType && { contentType: contentType as ContentType }),
      // Genre filter: use string_contains on the JSON field (works for name strings)
      ...(genres &&
        genres !== '' && {
          AND: genres.split(',').map((g) => ({
            genres: { string_contains: g.trim() },
          })),
        }),
    },
  };

  // Build orderBy
  let orderBy: Prisma.UserContentOrderByWithRelationInput;
  if (sortBy === 'tmdbRating') {
    orderBy = { content: { tmdbRating: sortOrder } };
  } else if (sortBy === 'title') {
    orderBy = { content: { title: sortOrder } };
  } else if (sortBy === 'year') {
    orderBy = { content: { year: sortOrder } };
  } else if (sortBy === 'userRating') {
    orderBy = { userRating: sortOrder };
  } else {
    orderBy = { addedAt: sortOrder };
  }

  const [items, total] = await Promise.all([
    prisma.userContent.findMany({
      where,
      include: { content: { include: { enrichments: { where: { source: 'omdb' }, take: 1 } } } },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.userContent.count({ where }),
  ]);

  // Flatten omdb ratings into content for convenience
  const formatted = items.map((item) => {
    const omdb = (item.content as any).enrichments?.[0]?.data as Record<string, any> | undefined;
    const { enrichments: _, ...contentRest } = item.content as any;
    return {
      ...item,
      content: {
        ...contentRest,
        omdbRatings: omdb?.Ratings ?? [],
        imdbRating: omdb?.imdbRating ?? null,
      },
    };
  });

  return NextResponse.json({ items: formatted, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const {
    profileId,
    tmdbId,
    contentType,
    userRating,
    notes,
    watchedDate,
    watchStatus,
    startDate,
    endDate,
    episodeCount,
  } = parsed.data;

  const profile = await prisma.profile.findFirst({
    where: { id: profileId, userId: session.user.id },
  });
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let content = await prisma.content.findFirst({
    where: contentType === 'ANIME' ? { malId: tmdbId } : { tmdbId },
  });

  if (!content) {
    try {
      if (contentType === 'ANIME') {
        const raw = await getJikanDetails(tmdbId);
        content = await prisma.content.create({
          data: {
            contentType: 'ANIME',
            title: raw.title_english ?? raw.title ?? '',
            year: raw.year,
            posterUrl: raw.images?.jpg?.large_image_url ?? null,
            overview: raw.synopsis ?? null,
            genres: raw.genres?.map((g) => ({ id: g.mal_id, name: g.name })) ?? [],
            status: raw.status ?? null,
            malId: raw.mal_id,
            tmdbRating: raw.score ? Number(raw.score.toFixed(1)) : null,
          },
        });
        await prisma.contentEnrichment.create({
          data: { contentId: content.id, source: 'jikan', data: raw as unknown as Prisma.InputJsonValue },
        });
      } else {
        const raw =
          contentType === 'TV_SHOW' ? await tmdb.tvDetails(tmdbId) : await tmdb.movieDetails(tmdbId);

        // Parse US age certification
        let ageCertification: string | null = null;
        if (contentType === 'MOVIE') {
          const usEntry = raw.release_dates?.results?.find((r) => r.iso_3166_1 === 'US');
          ageCertification = usEntry?.release_dates?.find((d) => d.certification)?.certification ?? null;
        } else {
          const usRating = raw.content_ratings?.results?.find((r) => r.iso_3166_1 === 'US');
          ageCertification = usRating?.rating ?? null;
        }

        content = await prisma.content.create({
          data: {
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
            imdbId: raw.imdb_id ?? null,
            tmdbRating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : null,
            tmdbVoteCount: raw.vote_count ?? null,
            ageCertification,
          },
        });

        if (contentType === 'MOVIE' && raw.imdb_id && process.env.OMDB_API_KEY) {
          const omdbRes = await fetch(
            `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${raw.imdb_id}`,
          );
          if (omdbRes.ok) {
            const omdbData = await omdbRes.json();
            if (omdbData.Response === 'True') {
              await prisma.contentEnrichment.create({
                data: { contentId: content.id, source: 'omdb', data: omdbData },
              });
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch/create content:', err);
      return NextResponse.json({ error: 'Failed to fetch content details' }, { status: 500 });
    }
  }

  const isSerial = contentType === 'TV_SHOW' || contentType === 'ANIME';
  const serialFields = isSerial
    ? {
        watchStatus: watchStatus ?? 'COMPLETED',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        episodeCount: episodeCount ?? null,
        watchedDate: null,
      }
    : {
        watchedDate: watchedDate ? new Date(watchedDate) : null,
        watchStatus: null,
        startDate: null,
        endDate: null,
        episodeCount: null,
      };

  const userContent = await prisma.userContent.upsert({
    where: { profileId_contentId: { profileId, contentId: content.id } },
    create: { profileId, contentId: content.id, userRating, notes, ...serialFields },
    update: { userRating, notes, ...serialFields, updatedAt: new Date() },
    include: { content: true },
  });

  return NextResponse.json(userContent, { status: 201 });
}
