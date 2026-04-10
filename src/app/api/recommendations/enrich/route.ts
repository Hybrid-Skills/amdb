import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { generateShortId } from '@/lib/id';
import { buildGenreNames } from '@/lib/genres';
import { ContentType } from '@prisma/client';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const { title, year, reason, label } = await req.json();
  if (!title) {
    return NextResponse.json({ error: 'title required' }, { status: 400 });
  }

  try {
    // 1. Search TMDB using typed endpoints (movie + tv) in parallel with year hint
    const [movieSearch, tvSearch] = await Promise.all([
      tmdb.searchMovies(title, 1, year || undefined),
      tmdb.searchTv(title, 1, year || undefined),
    ]);

    const allResults = [
      ...movieSearch.results.map((r: any) => ({ ...r, media_type: 'movie' })),
      ...tvSearch.results.map((r: any) => ({ ...r, media_type: 'tv' })),
    ];

    // Prefer exact title match, then year proximity, then first result
    const data = allResults.find(
      (r: any) => (r.title ?? r.name)?.toLowerCase() === title.toLowerCase()
    ) || allResults.find(
      (r: any) => Math.abs(
        (r.release_date ? new Date(r.release_date).getFullYear() : (r.first_air_date ? new Date(r.first_air_date).getFullYear() : 0)) - (year || 0)
      ) <= 1
    ) || allResults[0];

    if (!data) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const tmdbId = data.id;
    const isTv = data.media_type === 'tv';

    // Determine contentType — re-evaluate TV → ANIME using full details genres
    let contentType: ContentType = isTv ? ContentType.TV_SHOW : ContentType.MOVIE;

    // 2. Fetch Full Details for Certification and Runtime
    const details = isTv
      ? await tmdb.tvDetails(tmdbId)
      : await tmdb.movieDetails(tmdbId);

    if (isTv) {
      const genreIds = (details.genres ?? []).map((g: any) => g.id);
      const isJapanese =
        (details as any).original_language === 'ja' ||
        ((details as any).origin_country ?? []).includes('JP');
      if (isJapanese && genreIds.includes(16)) contentType = ContentType.ANIME;
    }

    // Extract Certification (IN Priority, US Fallback)
    let ageCertification = null;
    if (isTv) {
      const inRating = details.content_ratings?.results.find((r: any) => r.iso_3166_1 === 'IN')?.rating;
      const usRating = details.content_ratings?.results.find((r: any) => r.iso_3166_1 === 'US')?.rating;
      ageCertification = inRating || usRating || null;
    } else {
      const inRelease = details.release_dates?.results.find((r: any) => r.iso_3166_1 === 'IN');
      const usRelease = details.release_dates?.results.find((r: any) => r.iso_3166_1 === 'US');

      const inCert = inRelease?.release_dates.find((rd: any) => rd.certification)?.certification;
      const usCert = usRelease?.release_dates.find((rd: any) => rd.certification)?.certification;

      ageCertification = inCert || usCert || null;
    }

    // Extract Runtime
    const runtimeMins = !isTv ? (details.runtime || null) : null;
    const episodeRuntime = isTv ? (details.episode_run_time?.[0] || null) : null;

    // 3. Check local Database Cache by TMDB ID
    let content = await prisma.content.findUnique({
      where: { tmdbId },
    });

    // 4. Create or Update Content with rich metadata
    const contentData = {
      contentType,
      title: details.title ?? details.name ?? 'Untitled',
      year: details.release_date
          ? new Date(details.release_date).getFullYear()
          : details.first_air_date
            ? new Date(details.first_air_date).getFullYear()
            : (year || null),
      posterUrl: tmdbImageUrl(details.poster_path),
      backdropUrl: tmdbImageUrl(details.backdrop_path, 'w1280'),
      tmdbRating: details.vote_average,
      overview: details.overview,
      ageCertification,
      runtimeMins,
      episodeRuntime,
      genres: details.genres ?? [],
      genreNames: buildGenreNames(details.genres),
    };

    if (!content) {
      content = await prisma.content.create({
        data: {
          id: generateShortId(),
          tmdbId: tmdbId,
          ...contentData,
        },
      });
    } else {
      // Update existing content with fresh metadata if it was missing
      content = await prisma.content.update({
        where: { id: content.id },
        data: contentData,
      });
    }

    // 5. Guard: skip if already in user's watched or planned list
    const existing = await prisma.userContent.findUnique({
      where: { userId_contentId: { userId, contentId: content.id } },
      select: { id: true, listStatus: true },
    });
    if (existing && existing.listStatus !== 'RECOMMENDED') {
      return NextResponse.json(
        { error: 'already_in_list', listStatus: existing.listStatus },
        { status: 409 }
      );
    }

    // 6. Create UserContent entry (RECOMMENDED status)
    const userContent = await prisma.userContent.upsert({
      where: {
        userId_contentId: { userId, contentId: content.id }
      },
      update: {
        recommendationReason: reason || null,
        recommendationLabel: label as any || null,
      },
      create: {
        userId,
        contentId: content.id,
        listStatus: 'RECOMMENDED',
        recommendationReason: reason || null,
        recommendationLabel: label as any || null,
      }
    });

    return NextResponse.json({
      ...userContent,
      content: {
        ...content,
        reason: reason // Return the AI reason
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
