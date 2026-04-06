import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { tmdb, tmdbImageUrl } from '@/lib/tmdb';
import { prisma } from '@/lib/prisma';
import { getJikanDetails } from '@/lib/jikan';
import type { ContentType } from '@prisma/client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tmdbId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tmdbId } = await params;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get('type') ?? 'MOVIE') as ContentType;
  const id = Number(tmdbId);



  try {
    if (type === 'ANIME') {
      const raw = await getJikanDetails(id);
      return NextResponse.json({
        tmdbId: raw.mal_id,
        title: raw.title_english ?? raw.title ?? '',
        originalTitle: raw.title,
        year: raw.year,
        posterUrl: raw.images?.jpg?.large_image_url ?? null,
        backdropUrl: null,
        overview: raw.synopsis,
        tagline: null,
        genres: raw.genres?.map(g => ({ id: g.mal_id, name: g.name })) ?? [],
        runtimeMins: raw.duration,
        status: raw.status ?? null,
        imdbId: null,
        tmdbRating: raw.score ? Number(raw.score.toFixed(1)) : null,
        tmdbVoteCount: null,
        language: 'Japanese', // Standard for Jikan
        contentType: type,
        director: null,
        networks: raw.broadcast?.string ? [{ id: 1, name: raw.broadcast.string, logo_path: null }] : [],
        production_companies: raw.studios ?? [],
        adult: raw.rating?.includes('Rx') || raw.rating?.includes('R+'),
        number_of_episodes: raw.episodes,
        videos: raw.trailer?.youtube_id ? { results: [{ type: 'Trailer', key: raw.trailer.youtube_id, site: 'YouTube' }] } : null,
      });
    }

    const raw = type === 'TV_SHOW' ? await tmdb.tvDetails(id) : await tmdb.movieDetails(id);
    const crewBase = raw.credits?.crew ?? [];
    const cast = raw.credits?.cast?.slice(0, 10).map(c => ({...c, profile_path: tmdbImageUrl(c.profile_path)})) ?? [];

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
        director: crewBase.find(c => c.job === 'Director')?.name,
        writer: crewBase.find(c => c.job === 'Writer' || c.job === 'Screenplay')?.name,
        producer: crewBase.find(c => c.job === 'Producer')?.name,
      },
      cast,
      videos: raw.videos,
      similar: raw.similar,
    };

    let omdbRatings = [];
    if (content.imdbId && process.env.OMDB_API_KEY) {
      try {
        const omdbRes = await fetch(
          `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${content.imdbId}`,
        );
        if (omdbRes.ok) {
          const omdbData = await omdbRes.json();
          if (omdbData.Ratings) {
            omdbRatings = omdbData.Ratings;
          }
        }
      } catch (e) {
        console.error('OMDB fetch error in detail API:', e);
      }
    }

    return NextResponse.json({ ...content, omdbRatings });
  } catch (err) {
    console.error('Content detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch content details' }, { status: 500 });
  }
}
