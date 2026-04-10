import { NextResponse } from 'next/server';

export const preferredRegion = 'bom1';
export const dynamic = 'force-dynamic';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';
import { getJikanDetails } from '@/lib/jikan';
import { buildGenreNames } from '@/lib/genres';
import type { ContentType } from '@prisma/client';

export async function GET(req: Request, { params }: { params: Promise<{ tmdbId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId } = await params;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') ?? 'MOVIE') as ContentType;
  const quick = searchParams.get('quick') === '1';
  const id = Number(tmdbId);

  try {
    // ── Quick path: serve from DB only, no TMDB call ─────────────────────────
    if (quick) {
      const stored = await prisma.content.findFirst({
        where: { tmdbId: id },
        include: { enrichments: { where: { source: { in: ['omdb', 'jikan'] } } } },
      });

      if (!stored) return NextResponse.json({ error: 'Not in DB' }, { status: 404 });

      const omdbEnrichment = stored.enrichments.find((e) => e.source === 'omdb');
      const omdbRatings = omdbEnrichment
        ? ((omdbEnrichment.data as any).Ratings ?? [])
        : (stored.omdbRatings ?? []);

      const jikanEnrichment = type === 'ANIME'
        ? stored.enrichments.find((e) => e.source === 'jikan')
        : null;
      const malScore = jikanEnrichment
        ? Number(Number((jikanEnrichment.data as any).score ?? 0).toFixed(1)) || null
        : null;

      return NextResponse.json({
        // Identity
        id: stored.id,
        tmdbId: stored.tmdbId,
        malId: stored.malId,
        imdbId: stored.imdbId,
        contentType: stored.contentType,
        // Core
        title: stored.title,
        originalTitle: stored.originalTitle,
        year: stored.year,
        overview: stored.overview,
        tagline: stored.tagline,
        status: stored.status,
        adult: stored.adult,
        // Images
        posterUrl: stored.posterUrl,
        backdropUrl: stored.backdropUrl,
        // Ratings
        tmdbRating: stored.tmdbRating,
        tmdbVoteCount: stored.tmdbVoteCount,
        omdbRatings,
        malScore,
        // Genres (TMDB array format — modal reads g.name)
        genres: stored.genres,
        genreNames: stored.genreNames,
        // Runtime — both DB name and TMDB array format the modal reads
        runtimeMins: stored.runtimeMins,
        episode_run_time: stored.episodeRuntime ? [stored.episodeRuntime] : [],
        // TV metadata — use TMDB field names the modal reads
        number_of_seasons: stored.seasons,
        number_of_episodes: stored.episodes,
        networks: stored.networks,
        // Languages — stored as raw TMDB spoken_languages array (has english_name)
        spoken_languages: stored.languages,
        language: stored.language,
        // Financials
        revenue: stored.revenue,
        // Certification
        ageCertification: stored.ageCertification,
        _quick: true,
      }, {
        headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
      });
    }

    // ── Full path: parallel TMDB + DB ────────────────────────────────────────
    // 1. Parallelize TMDB fetch and internal DB check
    const tmdbPromise =
      type === 'TV_SHOW' || type === 'ANIME'
        ? tmdb.tvDetails(id)
        : tmdb.movieDetails(id);

    const prismaPromise = prisma.content.findFirst({
      where: { tmdbId: id },
      include: {
        enrichments: {
          where: { source: { in: ['omdb', 'jikan'] } },
        },
      },
    });

    const [raw, storedContent] = await Promise.all([tmdbPromise, prismaPromise]);

    // Backfill any null fields on old DB records using fresh TMDB data.
    // Awaited (not fire-and-forget) — serverless runtimes kill promises after
    // the response is sent, so fire-and-forget never completes on Vercel.
    // The TMDB fetch already dominates latency, so a small DB write adds ~20ms.
    if (storedContent) {
      const patch: Record<string, any> = {};
      if (!storedContent.backdropUrl && raw.backdrop_path)
        patch.backdropUrl = tmdbImageUrl(raw.backdrop_path, 'w1280');
      if (!storedContent.posterUrl && raw.poster_path)
        patch.posterUrl = tmdbImageUrl(raw.poster_path);
      if (!storedContent.originalTitle && (raw.original_title ?? raw.original_name))
        patch.originalTitle = raw.original_title ?? raw.original_name;
      if (!storedContent.overview && raw.overview)
        patch.overview = raw.overview;
      if (!storedContent.tagline && raw.tagline)
        patch.tagline = raw.tagline;
      if (!storedContent.status && raw.status)
        patch.status = raw.status;
      if (!storedContent.imdbId && raw.imdb_id)
        patch.imdbId = raw.imdb_id;
      if (!storedContent.runtimeMins && raw.runtime)
        patch.runtimeMins = raw.runtime;
      if (!storedContent.episodeRuntime && raw.episode_run_time?.[0])
        patch.episodeRuntime = raw.episode_run_time[0];
      if (!storedContent.tmdbRating && raw.vote_average)
        patch.tmdbRating = Number(raw.vote_average.toFixed(1));
      if (!storedContent.tmdbVoteCount && raw.vote_count)
        patch.tmdbVoteCount = raw.vote_count;
      if (!storedContent.language && raw.spoken_languages?.[0]?.english_name)
        patch.language = raw.spoken_languages[0].english_name;
      if (!storedContent.revenue && raw.revenue)
        patch.revenue = raw.revenue;
      if (!storedContent.seasons && raw.number_of_seasons)
        patch.seasons = raw.number_of_seasons;
      if (!storedContent.episodes && raw.number_of_episodes)
        patch.episodes = raw.number_of_episodes;
      // Json fields: check for empty arrays
      const storedGenres = storedContent.genres as any[];
      if ((!storedGenres || storedGenres.length === 0) && raw.genres?.length > 0) {
        patch.genres = raw.genres;
        patch.genreNames = buildGenreNames(raw.genres);
      }
      const storedNetworks = storedContent.networks as any[];
      if ((!storedNetworks || storedNetworks.length === 0) && (raw.networks?.length ?? 0) > 0)
        patch.networks = raw.networks;
      const storedLanguages = storedContent.languages as any[];
      if ((!storedLanguages || storedLanguages.length === 0) && (raw.spoken_languages?.length ?? 0) > 0)
        patch.languages = raw.spoken_languages;
      if (!storedContent.ageCertification) {
        const cert = type === 'TV_SHOW' || type === 'ANIME'
          ? (raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'IN')?.rating
            ?? raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US')?.rating
            ?? null)
          : (raw.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'IN')
              ?.release_dates?.find((d: any) => d.certification)?.certification
            ?? raw.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US')
              ?.release_dates?.find((d: any) => d.certification)?.certification
            ?? null);
        if (cert) patch.ageCertification = cert;
      }
      if (Object.keys(patch).length > 0) {
        await prisma.content.update({ where: { id: storedContent.id }, data: patch });
      }
    }

    const crewBase = raw.credits?.crew ?? [];
    const cast =
      raw.credits?.cast
        ?.slice(0, 10)
        .map((c) => ({ ...c, profile_path: tmdbImageUrl(c.profile_path) })) ?? [];

    const content = {
      tmdbId: raw.id,
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
      imdbId: raw.imdb_id ?? null,
      tmdbRating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : null,
      tmdbVoteCount: raw.vote_count ?? null,
      language: raw.spoken_languages?.[0]?.english_name ?? null,
      contentType: type,
      director: crewBase.find((c) => c.job === 'Director')?.name ?? null,
      budget: raw.budget,
      revenue: raw.revenue,
      adult: raw.adult,
      popularity: raw.popularity,
      spoken_languages: raw.spoken_languages,
      production_companies: raw.production_companies,
      number_of_seasons: raw.number_of_seasons,
      number_of_episodes: raw.number_of_episodes,
      episode_run_time: raw.episode_run_time,
      first_air_date: raw.first_air_date,
      last_air_date: raw.last_air_date,
      networks: raw.networks,
      crew: {
        director: crewBase.find((c) => c.job === 'Director')?.name,
        writer: crewBase.find((c) => c.job === 'Writer' || c.job === 'Screenplay')?.name,
        producer: crewBase.find((c) => c.job === 'Producer')?.name,
      },
      cast,
      videos: raw.videos,
      similar: raw.similar,
      // watch/providers is already fetched via append_to_response — include it here
      // so the modal doesn't need a second round trip to /api/watch-providers
      watchProviders:
        (raw as any)['watch/providers']?.results?.IN ??
        (raw as any)['watch/providers']?.results?.US ??
        null,
    };

    // ── Enrichments ─────────────────────────────────────
    let omdbRatings: { Source: string; Value: string }[] = [];
    let malScore: number | null = null;

    // OMDB — TTL based on release year: <1yr = 7 days, >1yr = 30 days
    const ONE_WEEK_MS  = 7  * 24 * 60 * 60 * 1000;
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;
    const contentYear = content.year ?? storedContent?.year ?? null;
    const omdbTtl = contentYear && (new Date().getFullYear() - contentYear) > 1
      ? ONE_MONTH_MS : ONE_WEEK_MS;

    const omdbEnrichment = storedContent?.enrichments?.find((e) => e.source === 'omdb');
    const omdbFresh = omdbEnrichment &&
      (Date.now() - new Date(omdbEnrichment.fetchedAt).getTime() < omdbTtl);

    if (omdbFresh && omdbEnrichment) {
      omdbRatings = (omdbEnrichment.data as Record<string, any>).Ratings ?? [];
    } else if (content.imdbId && process.env.OMDB_API_KEY) {
      try {
        const omdbRes = await fetch(
          `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${content.imdbId}`,
        );
        if (omdbRes.ok) {
          const omdbData = await omdbRes.json();
          if (omdbData.Ratings) {
            omdbRatings = omdbData.Ratings;
            if (storedContent?.id) {
              await prisma.contentEnrichment.upsert({
                where: { contentId_source: { contentId: storedContent.id, source: 'omdb' } },
                update: { data: omdbData, fetchedAt: new Date() },
                create: { contentId: storedContent.id, source: 'omdb', data: omdbData },
              }).catch(e => console.error('Failed to persist OMDB data in API:', e));
            }
          }
        }
      } catch (e) {
        console.error('OMDB fetch error in detail API:', e);
        if (omdbEnrichment) omdbRatings = (omdbEnrichment.data as Record<string, any>).Ratings ?? [];
      }
    }

    // Jikan (MAL) — DB only
    if (type === 'ANIME') {
      const jikanEnrichment = storedContent?.enrichments?.find((e) => e.source === 'jikan');
      if (jikanEnrichment) {
        const jikanData = jikanEnrichment.data as Record<string, any>;
        malScore = jikanData?.score ? Number(Number(jikanData.score).toFixed(1)) : null;
      }
    }

    return NextResponse.json(
      { ...content, omdbRatings, malScore },
      {
        headers: {
          'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        },
      },
    );
  } catch (err) {
    console.error('Content detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch content details' }, { status: 500 });
  }
}
