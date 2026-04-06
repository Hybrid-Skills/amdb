import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { searchJikan } from '@/lib/jikan';
import type { ContentType } from '@prisma/client';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim();
  const type = (searchParams.get('type') ?? 'all') as ContentType | 'all';
  const page = Number(searchParams.get('page') ?? '1');

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], totalPages: 0 });
  }

  try {
    if (type === 'ANIME') {
      const [tmdbData, jikanData] = await Promise.all([
        tmdb.searchTv(query, page),
        searchJikan(query),
      ]);

      const tmdbResults = tmdbData.results.map((r) => ({
        tmdbId: r.id,
        title: r.name ?? r.title ?? '',
        year: r.first_air_date ? new Date(r.first_air_date).getFullYear() : null,
        posterUrl: tmdbImageUrl(r.poster_path),
        tmdbRating: r.vote_average,
        overview: r.overview,
        contentType: 'ANIME' as ContentType,
      }));

      const tmdbTitles = new Set(tmdbResults.map((r) => r.title.toLowerCase()));

      const jikanResults = jikanData.results
        .filter((r: any) => !tmdbTitles.has((r.title_english || r.title).toLowerCase()))
        .map((r: any) => ({
          malId: r.malId,
          title: r.title_english || r.title,
          year: r.year,
          posterUrl: r.images?.jpg?.large_image_url ?? null,
          tmdbRating: r.score,
          overview: r.synopsis,
          contentType: 'ANIME' as ContentType,
        }));

      return NextResponse.json({
        results: [...tmdbResults, ...jikanResults],
        totalPages: Math.min(tmdbData.total_pages, 20),
      });
    }

    if (type === 'MOVIE') {
      const data = await tmdb.searchMovies(query, page);
      return NextResponse.json({
        results: data.results.map((r) => ({
          tmdbId: r.id,
          title: r.title ?? r.name ?? '',
          year: r.release_date ? new Date(r.release_date).getFullYear() : null,
          posterUrl: tmdbImageUrl(r.poster_path),
          tmdbRating: r.vote_average,
          overview: r.overview,
          contentType: 'MOVIE' as ContentType,
        })),
        totalPages: Math.min(data.total_pages, 20),
      });
    }

    if (type === 'TV_SHOW') {
      const data = await tmdb.searchTv(query, page);
      return NextResponse.json({
        results: data.results.map((r) => ({
          tmdbId: r.id,
          title: r.name ?? r.title ?? '',
          year: r.first_air_date ? new Date(r.first_air_date).getFullYear() : null,
          posterUrl: tmdbImageUrl(r.poster_path),
          tmdbRating: r.vote_average,
          overview: r.overview,
          contentType: 'TV_SHOW' as ContentType,
        })),
        totalPages: Math.min(data.total_pages, 20),
      });
    }

    // 'all' — search movies + TV together via multi search
    const data = await tmdb.searchMulti(query, page);

    // Heuristic: Japanese animation on TMDB appears as media_type='tv'.
    // Classify as ANIME if: original_language is 'ja' AND genre 16 (Animation) is present.
    function detectContentType(r: (typeof data.results)[0]): ContentType {
      if (r.media_type === 'movie') return 'MOVIE';
      const isJapaneseAnimation =
        (r as any).original_language === 'ja' && (r.genre_ids ?? []).includes(16);
      return isJapaneseAnimation ? 'ANIME' : 'TV_SHOW';
    }

    return NextResponse.json({
      results: data.results
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .map((r) => ({
          tmdbId: r.id,
          title: r.title ?? r.name ?? '',
          year: r.release_date
            ? new Date(r.release_date).getFullYear()
            : r.first_air_date
              ? new Date(r.first_air_date).getFullYear()
              : null,
          posterUrl: tmdbImageUrl(r.poster_path),
          tmdbRating: r.vote_average,
          overview: r.overview,
          contentType: detectContentType(r),
        })),
      totalPages: Math.min(data.total_pages, 20),
    });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
