/**
 * Server-side fetcher for content detail pages.
 * Called directly from Next.js Server Components — no auth needed for public pages.
 */

import { tmdb, tmdbImageUrl } from './tmdb';
import { getJikanDetails } from './jikan';

export interface ContentDetail {
  id: number;
  contentType: 'MOVIE' | 'TV_SHOW' | 'ANIME';
  title: string;
  originalTitle: string | null;
  year: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  tagline: string | null;
  genres: { id: number; name: string }[];
  status: string | null;
  imdbId: string | null;
  tmdbRating: number | null;
  tmdbVoteCount: number | null;
  popularity: number | null;
  adult: boolean;
  ageCertification: string | null;

  // Financials (movies)
  budget: number | null;
  revenue: number | null;

  // Runtime
  runtimeMins: number | null;
  episodeRuntime: number | null;

  // Series-specific
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  firstAirDate: string | null;
  lastAirDate: string | null;
  networks: { id: number; name: string; logo_path: string | null }[];

  // Languages & companies
  spokenLanguages: { english_name: string; iso_639_1: string }[];
  productionCompanies: { id: number; name: string; logo_path: string | null }[];

  // Crew
  crew: {
    director: string | null;
    writer: string | null;
    producer: string | null;
    cinematographer: string | null;
    composer: string | null;
  };

  // Full cast (for Tier 4)
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];

  // Full crew list (Tier 4)
  fullCrew: { id: number; name: string; job: string; department: string }[];

  // Media
  videos: { key: string; name: string; type: string; site: string; official: boolean }[];

  // Keywords
  keywords: string[];

  // Similar
  similar: { id: number; title: string; poster_path: string | null; vote_average: number }[];

  // External IDs
  externalIds: {
    imdb_id: string | null;
    facebook_id: string | null;
    instagram_id: string | null;
    twitter_id: string | null;
  };

  // Watch providers (JustWatch via TMDB)
  watchProviders: {
    link: string;
    flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
    rent?: { provider_id: number; provider_name: string; logo_path: string }[];
    buy?: { provider_id: number; provider_name: string; logo_path: string }[];
  } | null;

  // Release dates (Tier 4)
  releaseDates: {
    country: string;
    date: string;
    certification: string;
    type: string;
  }[];
}

export async function fetchMovieDetail(tmdbId: number): Promise<ContentDetail> {
  const raw = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,videos,similar,keywords,external_ids,release_dates,watch/providers`,
    { next: { revalidate: 3600 } }
  ).then((r) => r.json());

  const crewBase: any[] = raw.credits?.crew ?? [];
  const castBase: any[] = raw.credits?.cast ?? [];

  // US certification
  const usEntry = raw.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const ageCertification = usEntry?.release_dates?.find((d: any) => d.certification)?.certification ?? null;

  // All release dates flattened
  const releaseDates: ContentDetail['releaseDates'] = [];
  for (const country of raw.release_dates?.results ?? []) {
    for (const rd of country.release_dates ?? []) {
      if (rd.release_date) {
        releaseDates.push({
          country: country.iso_3166_1,
          date: rd.release_date,
          certification: rd.certification,
          type: rd.type === 3 ? 'Theatrical' : rd.type === 1 ? 'Premiere' : rd.type === 4 ? 'Digital' : rd.type === 5 ? 'Physical' : rd.type === 6 ? 'TV' : 'Other',
        });
      }
    }
  }

  const watchProviderRaw = raw['watch/providers']?.results?.IN ?? raw['watch/providers']?.results?.US ?? null;

  return {
    id: raw.id,
    contentType: 'MOVIE',
    title: raw.title ?? '',
    originalTitle: raw.original_title ?? null,
    year: raw.release_date ? new Date(raw.release_date).getFullYear() : null,
    posterUrl: tmdbImageUrl(raw.poster_path),
    backdropUrl: tmdbImageUrl(raw.backdrop_path, 'original'),
    overview: raw.overview ?? null,
    tagline: raw.tagline ?? null,
    genres: raw.genres ?? [],
    status: raw.status ?? null,
    imdbId: raw.imdb_id ?? null,
    tmdbRating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : null,
    tmdbVoteCount: raw.vote_count ?? null,
    popularity: raw.popularity ?? null,
    adult: raw.adult ?? false,
    ageCertification,
    budget: raw.budget ?? null,
    revenue: raw.revenue ?? null,
    runtimeMins: raw.runtime ?? null,
    episodeRuntime: null,
    numberOfSeasons: null,
    numberOfEpisodes: null,
    firstAirDate: null,
    lastAirDate: null,
    networks: [],
    spokenLanguages: raw.spoken_languages ?? [],
    productionCompanies: raw.production_companies ?? [],
    crew: {
      director: crewBase.find((c) => c.job === 'Director')?.name ?? null,
      writer: crewBase.find((c) => c.job === 'Writer' || c.job === 'Screenplay')?.name ?? null,
      producer: crewBase.find((c) => c.job === 'Producer')?.name ?? null,
      cinematographer: crewBase.find((c) => c.job === 'Director of Photography')?.name ?? null,
      composer: crewBase.find((c) => c.job === 'Original Music Composer')?.name ?? null,
    },
    cast: castBase.map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
      order: c.order,
    })),
    fullCrew: crewBase.map((c) => ({ id: c.id, name: c.name, job: c.job, department: c.department })),
    videos: (raw.videos?.results ?? [])
      .filter((v: any) => v.site === 'YouTube')
      .map((v: any) => ({ key: v.key, name: v.name, type: v.type, site: v.site, official: v.official ?? false })),
    keywords: raw.keywords?.keywords?.map((k: any) => k.name) ?? [],
    similar: (raw.similar?.results ?? []).slice(0, 12).map((s: any) => ({
      id: s.id,
      title: s.title ?? s.name ?? '',
      poster_path: s.poster_path ? tmdbImageUrl(s.poster_path) : null,
      vote_average: s.vote_average,
    })),
    externalIds: {
      imdb_id: raw.external_ids?.imdb_id ?? raw.imdb_id ?? null,
      facebook_id: raw.external_ids?.facebook_id ?? null,
      instagram_id: raw.external_ids?.instagram_id ?? null,
      twitter_id: raw.external_ids?.twitter_id ?? null,
    },
    watchProviders: watchProviderRaw ? {
      link: watchProviderRaw.link ?? '',
      flatrate: watchProviderRaw.flatrate?.map((p: any) => ({ ...p, logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}` })),
      rent: watchProviderRaw.rent?.map((p: any) => ({ ...p, logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}` })),
      buy: watchProviderRaw.buy?.map((p: any) => ({ ...p, logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}` })),
    } : null,
    releaseDates,
  };
}

export async function fetchTvDetail(tmdbId: number): Promise<ContentDetail> {
  const raw = await fetch(
    `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits,videos,similar,keywords,external_ids,content_ratings,watch/providers`,
    { next: { revalidate: 3600 } }
  ).then((r) => r.json());

  const crewBase: any[] = raw.credits?.crew ?? [];
  const castBase: any[] = raw.credits?.cast ?? [];

  const usRating = raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const ageCertification = usRating?.rating ?? null;

  const watchProviderRaw = raw['watch/providers']?.results?.IN ?? raw['watch/providers']?.results?.US ?? null;

  // Determine ongoing status
  const lastAirDate = raw.last_air_date ?? null;
  const today = new Date();
  const lastAirObj = lastAirDate ? new Date(lastAirDate) : null;
  const isOngoing = !lastAirObj || (today.getTime() - lastAirObj.getTime()) < 7 * 24 * 60 * 60 * 1000;

  return {
    id: raw.id,
    contentType: 'TV_SHOW',
    title: raw.name ?? '',
    originalTitle: raw.original_name ?? null,
    year: raw.first_air_date ? new Date(raw.first_air_date).getFullYear() : null,
    posterUrl: tmdbImageUrl(raw.poster_path),
    backdropUrl: tmdbImageUrl(raw.backdrop_path, 'original'),
    overview: raw.overview ?? null,
    tagline: raw.tagline ?? null,
    genres: raw.genres ?? [],
    status: isOngoing ? 'Ongoing' : raw.status ?? null,
    imdbId: raw.external_ids?.imdb_id ?? null,
    tmdbRating: raw.vote_average ? Number(raw.vote_average.toFixed(1)) : null,
    tmdbVoteCount: raw.vote_count ?? null,
    popularity: raw.popularity ?? null,
    adult: raw.adult ?? false,
    ageCertification,
    budget: null,
    revenue: null,
    runtimeMins: null,
    episodeRuntime: raw.episode_run_time?.[0] ?? null,
    numberOfSeasons: raw.number_of_seasons ?? null,
    numberOfEpisodes: raw.number_of_episodes ?? null,
    firstAirDate: raw.first_air_date ?? null,
    lastAirDate: isOngoing ? null : lastAirDate,
    networks: raw.networks ?? [],
    spokenLanguages: raw.spoken_languages ?? [],
    productionCompanies: raw.production_companies ?? [],
    crew: {
      director: crewBase.find((c) => c.job === 'Director')?.name ?? null,
      writer: crewBase.find((c) => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Creator')?.name ?? null,
      producer: crewBase.find((c) => c.job === 'Executive Producer')?.name ?? null,
      cinematographer: crewBase.find((c) => c.job === 'Director of Photography')?.name ?? null,
      composer: crewBase.find((c) => c.job === 'Original Music Composer')?.name ?? null,
    },
    cast: castBase.map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? c.roles?.[0]?.character ?? '',
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
      order: c.order,
    })),
    fullCrew: crewBase.map((c) => ({ id: c.id, name: c.name, job: c.job, department: c.department })),
    videos: (raw.videos?.results ?? []).filter((v: any) => v.site === 'YouTube').map((v: any) => ({ key: v.key, name: v.name, type: v.type, site: v.site, official: v.official ?? false })),
    keywords: raw.keywords?.results?.map((k: any) => k.name) ?? [],
    similar: (raw.similar?.results ?? []).slice(0, 12).map((s: any) => ({ id: s.id, title: s.title ?? s.name ?? '', poster_path: s.poster_path ? tmdbImageUrl(s.poster_path) : null, vote_average: s.vote_average })),
    externalIds: { imdb_id: raw.external_ids?.imdb_id ?? null, facebook_id: raw.external_ids?.facebook_id ?? null, instagram_id: raw.external_ids?.instagram_id ?? null, twitter_id: raw.external_ids?.twitter_id ?? null },
    watchProviders: watchProviderRaw ? {
      link: watchProviderRaw.link ?? '',
      flatrate: watchProviderRaw.flatrate?.map((p: any) => ({ ...p, logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}` })),
      rent: watchProviderRaw.rent?.map((p: any) => ({ ...p, logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}` })),
      buy: watchProviderRaw.buy?.map((p: any) => ({ ...p, logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}` })),
    } : null,
    releaseDates: [],
  };
}

export async function fetchAnimeDetail(malId: number): Promise<ContentDetail> {
  const raw = await getJikanDetails(malId);

  const isOngoing = raw.status === 'Currently Airing';

  return {
    id: malId,
    contentType: 'ANIME',
    title: raw.title_english ?? raw.title ?? '',
    originalTitle: raw.title ?? null,
    year: raw.year ?? null,
    posterUrl: raw.images?.jpg?.large_image_url ?? null,
    backdropUrl: null,
    overview: raw.synopsis ?? null,
    tagline: null,
    genres: raw.genres?.map((g: any) => ({ id: g.mal_id, name: g.name })) ?? [],
    status: isOngoing ? 'Ongoing' : raw.status ?? null,
    imdbId: null,
    tmdbRating: raw.score ? Number(raw.score.toFixed(1)) : null,
    tmdbVoteCount: raw.scored_by ?? null,
    popularity: raw.members ?? null,
    adult: raw.rating?.includes('Rx') || raw.rating?.includes('R+') || false,
    ageCertification: raw.rating ?? null,
    budget: null,
    revenue: null,
    runtimeMins: null,
    episodeRuntime: typeof raw.duration === 'number' ? raw.duration : null,
    numberOfSeasons: null,
    numberOfEpisodes: raw.episodes ?? null,
    firstAirDate: raw.aired?.from ?? null,
    lastAirDate: isOngoing ? null : (raw.aired?.to ?? null),
    networks: raw.broadcast?.string ? [{ id: 1, name: raw.broadcast.string, logo_path: null }] : [],
    spokenLanguages: [{ english_name: 'Japanese', iso_639_1: 'ja' }],
    productionCompanies: raw.studios?.map((s: any) => ({ id: s.mal_id, name: s.name, logo_path: null })) ?? [],
    crew: { director: null, writer: null, producer: null, cinematographer: null, composer: null },
    cast: raw.characters?.slice(0, 20).map((c: any) => ({
      id: c.character?.mal_id ?? 0,
      name: c.character?.name ?? '',
      character: c.role ?? '',
      profile_path: c.character?.images?.jpg?.image_url ?? null,
      order: 0,
    })) ?? [],
    fullCrew: [],
    videos: raw.trailer?.youtube_id ? [{ key: raw.trailer.youtube_id, name: 'Trailer', type: 'Trailer', site: 'YouTube', official: true }] : [],
    keywords: raw.themes?.map((t: any) => t.name) ?? [],
    similar: raw.relations?.filter((r: any) => r.relation === 'Sequel' || r.relation === 'Prequel' || r.relation === 'Side story').flatMap((r: any) => r.entry ?? []).slice(0, 8).map((e: any) => ({
      id: e.mal_id, title: e.name, poster_path: null, vote_average: 0,
    })) ?? [],
    externalIds: { imdb_id: null, facebook_id: null, instagram_id: null, twitter_id: null },
    watchProviders: null,
    releaseDates: [],
  };
}
