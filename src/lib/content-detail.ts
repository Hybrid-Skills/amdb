import { tmdb, tmdbImageUrl } from './tmdb';
import { getJikanDetails } from './jikan';
import { prisma } from './prisma';

export interface ContentDetail {
  id: string; // Internal AMDB ID (CUID)

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
  tmdbId: number | null;
  malId: number | null;
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
  omdbRatings?: { Source: string; Value: string }[];
  malScore?: number | null;
}

// --- Modular Fetchers (for Streaming/RSC) ---

export async function fetchMainContent(id: string) {
  const content = await prisma.content.findUnique({
    where: { id },
    include: { enrichments: true },
  });
  if (!content) throw new Error('Content not found in AMDB');
  return content;
}

export async function getTmdbCommon(tmdbId: number, type: 'movie' | 'tv', append: string = '') {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}${append ? `&append_to_response=${append}` : ''}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB fetch failed for ${type} ${tmdbId}`);
  return res.json();
}

// Re-using existing logic to assemble the full object (Legacy wrapper)
export async function fetchMovieDetail(id: string): Promise<ContentDetail> {
  const contentRecord = await fetchMainContent(id);
  const tmdbId = contentRecord.tmdbId;
  let raw: any = {};

  try {
    if (!tmdbId) throw new Error('Missing tmdbId for movie enrichment');
    raw = await getTmdbCommon(
      tmdbId,
      'movie',
      'credits,videos,keywords,external_ids,release_dates,watch/providers',
    );
  } catch (e) {
    console.error(`[AMDB] TMDB fetch error for movie ${id}:`, e);
  }

  const crewBase: any[] = raw.credits?.crew ?? [];
  const castBase: any[] = raw.credits?.cast ?? [];
  const usEntry = raw.release_dates?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const ageCertification =
    usEntry?.release_dates?.find((d: any) => d.certification)?.certification ?? null;

  const releaseDates: ContentDetail['releaseDates'] = [];
  for (const country of raw.release_dates?.results ?? []) {
    for (const rd of country.release_dates ?? []) {
      if (rd.release_date) {
        releaseDates.push({
          country: country.iso_3166_1,
          date: rd.release_date,
          certification: rd.certification,
          type:
            rd.type === 3
              ? 'Theatrical'
              : rd.type === 1
                ? 'Premiere'
                : rd.type === 4
                  ? 'Digital'
                  : rd.type === 5
                    ? 'Physical'
                    : rd.type === 6
                      ? 'TV'
                      : 'Other',
        });
      }
    }
  }

  const watchProviderRaw =
    raw['watch/providers']?.results?.IN ?? raw['watch/providers']?.results?.US ?? null;
  let omdbRatings = [];
  const storedOmdb = contentRecord.enrichments.find((e: any) => e.source === 'omdb');
  if (storedOmdb) {
    omdbRatings = (storedOmdb.data as any).Ratings ?? [];
  } else if (raw.imdb_id && process.env.OMDB_API_KEY) {
    try {
      const omdbRes = await fetch(
        `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${raw.imdb_id}`,
        { next: { revalidate: 3600 } },
      );
      if (omdbRes.ok) {
        const omdbData = await omdbRes.json();
        if (omdbData.Ratings) {
          omdbRatings = omdbData.Ratings;
          // Persist to DB to save quota
          await prisma.contentEnrichment.upsert({
            where: { contentId_source: { contentId: id, source: 'omdb' } },
            update: { data: omdbData },
            create: { contentId: id, source: 'omdb', data: omdbData },
          }).catch(e => console.error('Failed to persist OMDB data:', e));
        }
      }
    } catch (e) {
      console.error('OMDB fetch error:', e);
    }
  }

  return {
    id,
    contentType: 'MOVIE',
    title: raw.title ?? contentRecord.title,
    originalTitle: raw.original_title ?? contentRecord.originalTitle,
    year: raw.release_date ? new Date(raw.release_date).getFullYear() : contentRecord.year,
    posterUrl: tmdbImageUrl(raw.poster_path) ?? contentRecord.posterUrl,
    backdropUrl: tmdbImageUrl(raw.backdrop_path, 'w1280') ?? contentRecord.backdropUrl,
    overview: raw.overview ?? contentRecord.overview,
    tagline: raw.tagline ?? contentRecord.tagline,
    genres: raw.genres ?? (contentRecord.genres as any) ?? [],
    status: raw.status ?? contentRecord.status,
    imdbId: raw.imdb_id ?? contentRecord.imdbId,
    tmdbId: tmdbId ?? null,
    malId: null,
    tmdbRating: raw.vote_average
      ? Number(raw.vote_average.toFixed(1))
      : contentRecord.tmdbRating
        ? Number(contentRecord.tmdbRating)
        : null,
    tmdbVoteCount: raw.vote_count ?? contentRecord.tmdbVoteCount,
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
    fullCrew: crewBase.map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
    })),
    videos: (raw.videos?.results ?? [])
      .filter((v: any) => v.site === 'YouTube')
      .map((v: any) => ({
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official ?? false,
      })),
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
    watchProviders:
      raw['watch/providers']?.results?.IN || raw['watch/providers']?.results?.US
        ? {
            link:
              (raw['watch/providers']?.results?.IN || raw['watch/providers']?.results?.US).link ??
              '',
            flatrate: (
              raw['watch/providers']?.results?.IN || raw['watch/providers']?.results?.US
            ).flatrate?.map((p: any) => ({
              ...p,
              logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
            })),
            rent: (
              raw['watch/providers']?.results?.IN || raw['watch/providers']?.results?.US
            ).rent?.map((p: any) => ({
              ...p,
              logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
            })),
            buy: (
              raw['watch/providers']?.results?.IN || raw['watch/providers']?.results?.US
            ).buy?.map((p: any) => ({
              ...p,
              logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
            })),
          }
        : null,
    releaseDates,
    omdbRatings,
  };
}

export async function fetchTvDetail(id: string): Promise<ContentDetail> {
  const contentRecord = await fetchMainContent(id);
  const tmdbId = contentRecord.tmdbId;
  let raw: any = {};

  try {
    if (!tmdbId) throw new Error('Missing tmdbId for TV enrichment');
    raw = await getTmdbCommon(
      tmdbId,
      'tv',
      'credits,videos,keywords,external_ids,content_ratings,watch/providers',
    );
  } catch (e) {
    console.error(`[AMDB] TMDB fetch error for TV ${id}:`, e);
  }

  const crewBase: any[] = raw.credits?.crew ?? [];
  const castBase: any[] = raw.credits?.cast ?? [];
  const usRating = raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const ageCertification = usRating?.rating ?? null;

  const watchProviderRaw =
    raw['watch/providers']?.results?.IN ?? raw['watch/providers']?.results?.US ?? null;
  let omdbRatings = [];
  let malScore: number | null = null;
  const imdbId = raw.external_ids?.imdb_id || null;

  const storedOmdb = contentRecord.enrichments.find((e: any) => e.source === 'omdb');
  if (storedOmdb) omdbRatings = (storedOmdb.data as any).Ratings ?? [];
  const storedJikan = contentRecord.enrichments.find((e: any) => e.source === 'jikan');
  if (storedJikan)
    malScore = (storedJikan.data as any).score
      ? Number(Number((storedJikan.data as any).score).toFixed(1))
      : null;

  if (omdbRatings.length === 0 && imdbId && process.env.OMDB_API_KEY) {
    try {
      const omdbRes = await fetch(
        `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${imdbId}`,
        { next: { revalidate: 3600 } },
      );
      if (omdbRes.ok) {
        const omdbData = await omdbRes.json();
        if (omdbData.Ratings) {
          omdbRatings = omdbData.Ratings;
          // Persist to DB to save quota
          await prisma.contentEnrichment.upsert({
            where: { contentId_source: { contentId: id, source: 'omdb' } },
            update: { data: omdbData },
            create: { contentId: id, source: 'omdb', data: omdbData },
          }).catch(e => console.error('Failed to persist OMDB data:', e));
        }
      }
    } catch (e) {
      console.error('OMDB fetch error:', e);
    }
  }

  const lastAirDate = raw.last_air_date ?? null;
  const today = new Date();
  const lastAirObj = lastAirDate ? new Date(lastAirDate) : null;
  const isOngoing = !lastAirObj || today.getTime() - lastAirObj.getTime() < 7 * 24 * 60 * 60 * 1000;

  return {
    id,
    contentType: 'TV_SHOW',
    title: raw.name ?? contentRecord.title,
    originalTitle: raw.original_name ?? contentRecord.originalTitle,
    year: raw.first_air_date ? new Date(raw.first_air_date).getFullYear() : contentRecord.year,
    posterUrl: tmdbImageUrl(raw.poster_path) ?? contentRecord.posterUrl,
    backdropUrl: tmdbImageUrl(raw.backdrop_path, 'w1280') ?? contentRecord.backdropUrl,
    overview: raw.overview ?? contentRecord.overview,
    tagline: raw.tagline ?? contentRecord.tagline,
    genres: raw.genres ?? (contentRecord.genres as any) ?? [],
    status: isOngoing ? 'Ongoing' : (raw.status ?? contentRecord.status),
    imdbId: raw.external_ids?.imdb_id ?? contentRecord.imdbId,
    tmdbId: tmdbId ?? null,
    malId: null,
    tmdbRating: raw.vote_average
      ? Number(raw.vote_average.toFixed(1))
      : contentRecord.tmdbRating
        ? Number(contentRecord.tmdbRating)
        : null,
    tmdbVoteCount: raw.vote_count ?? contentRecord.tmdbVoteCount,
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
      writer:
        crewBase.find((c) => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Creator')
          ?.name ?? null,
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
    fullCrew: crewBase.map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
    })),
    videos: (raw.videos?.results ?? [])
      .filter((v: any) => v.site === 'YouTube')
      .map((v: any) => ({
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official ?? false,
      })),
    keywords: raw.keywords?.results?.map((k: any) => k.name) ?? [],
    similar: (raw.similar?.results ?? []).slice(0, 12).map((s: any) => ({
      id: s.id,
      title: s.title ?? s.name ?? '',
      poster_path: s.poster_path ? tmdbImageUrl(s.poster_path) : null,
      vote_average: s.vote_average,
    })),
    externalIds: {
      imdb_id: raw.external_ids?.imdb_id ?? null,
      facebook_id: raw.external_ids?.facebook_id ?? null,
      instagram_id: raw.external_ids?.instagram_id ?? null,
      twitter_id: raw.external_ids?.twitter_id ?? null,
    },
    watchProviders: watchProviderRaw
      ? {
          link: watchProviderRaw.link ?? '',
          flatrate: watchProviderRaw.flatrate?.map((p: any) => ({
            ...p,
            logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
          })),
          rent: watchProviderRaw.rent?.map((p: any) => ({
            ...p,
            logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
          })),
          buy: watchProviderRaw.buy?.map((p: any) => ({
            ...p,
            logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
          })),
        }
      : null,
    releaseDates: [],
    omdbRatings,
    malScore,
  };
}

export async function fetchAnimeDetail(id: string): Promise<ContentDetail> {
  const contentRecord = await fetchMainContent(id);
  if (!contentRecord.tmdbId && contentRecord.malId)
    return fetchAnimeByMalId(contentRecord.malId, id);

  const tmdbId = contentRecord.tmdbId;
  let raw: any = {};
  try {
    if (!tmdbId) throw new Error('Anime missing TMDB ID');
    raw = await getTmdbCommon(
      tmdbId,
      'tv',
      'credits,videos,keywords,external_ids,content_ratings,watch/providers',
    );
  } catch (e) {
    console.error(`[AMDB] TMDB fetch error for Anime ${id}:`, e);
  }

  const crewBase: any[] = raw.credits?.crew ?? [];
  const castBase: any[] = raw.credits?.cast ?? [];
  const usRating = raw.content_ratings?.results?.find((r: any) => r.iso_3166_1 === 'US');
  const ageCertification = usRating?.rating ?? null;
  const watchProviderRaw =
    raw['watch/providers']?.results?.IN ?? raw['watch/providers']?.results?.US ?? null;

  const lastAirDate = raw.last_air_date ?? null;
  const today = new Date();
  const lastAirObj = lastAirDate ? new Date(lastAirDate) : null;
  const isOngoing = !lastAirObj || today.getTime() - lastAirObj.getTime() < 7 * 24 * 60 * 60 * 1000;

  let omdbRatings = [];
  let malScore: number | null = null;
  const storedOmdb = contentRecord.enrichments.find((e: any) => e.source === 'omdb');
  if (storedOmdb) omdbRatings = (storedOmdb.data as any).Ratings ?? [];
  const storedJikan = contentRecord.enrichments.find((e: any) => e.source === 'jikan');
  if (storedJikan)
    malScore = (storedJikan.data as any).score
      ? Number(Number((storedJikan.data as any).score).toFixed(1))
      : null;

  const imdbId = raw.external_ids?.imdb_id || null;
  if (omdbRatings.length === 0 && imdbId && process.env.OMDB_API_KEY) {
    try {
      const omdbRes = await fetch(
        `https://www.omdbapi.com/?apikey=${process.env.OMDB_API_KEY}&i=${imdbId}`,
        { next: { revalidate: 3600 } },
      );
      if (omdbRes.ok) {
        const omdbData = await omdbRes.json();
        if (omdbData.Ratings) {
          omdbRatings = omdbData.Ratings;
          // Persist to DB to save quota
          await prisma.contentEnrichment.upsert({
            where: { contentId_source: { contentId: id, source: 'omdb' } },
            update: { data: omdbData },
            create: { contentId: id, source: 'omdb', data: omdbData },
          }).catch(e => console.error('Failed to persist OMDB data:', e));
        }
      }
    } catch (e) {
      console.error('OMDB fetch error:', e);
    }
  }

  return {
    id,
    contentType: 'ANIME',
    title: raw.name ?? contentRecord.title,
    originalTitle: raw.original_name ?? contentRecord.originalTitle,
    year: raw.first_air_date ? new Date(raw.first_air_date).getFullYear() : contentRecord.year,
    posterUrl: tmdbImageUrl(raw.poster_path) ?? contentRecord.posterUrl,
    backdropUrl: tmdbImageUrl(raw.backdrop_path, 'w1280') ?? contentRecord.backdropUrl,
    overview: raw.overview ?? contentRecord.overview,
    tagline: raw.tagline ?? contentRecord.tagline,
    genres: raw.genres ?? (contentRecord.genres as any) ?? [],
    status: isOngoing ? 'Ongoing' : (raw.status ?? contentRecord.status),
    imdbId: raw.external_ids?.imdb_id ?? contentRecord.imdbId,
    tmdbId: tmdbId ?? null,
    malId: contentRecord.malId ?? null,
    tmdbRating: raw.vote_average
      ? Number(raw.vote_average.toFixed(1))
      : contentRecord.tmdbRating
        ? Number(contentRecord.tmdbRating)
        : null,
    tmdbVoteCount: raw.vote_count ?? contentRecord.tmdbVoteCount,
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
      writer:
        crewBase.find(
          (c) =>
            c.job === 'Writer' ||
            c.job === 'Screenplay' ||
            c.job === 'Creator' ||
            c.job === 'Story',
        )?.name ?? null,
      producer:
        crewBase.find((c) => c.job === 'Executive Producer' || c.job === 'Producer')?.name ?? null,
      cinematographer: crewBase.find((c) => c.job === 'Director of Photography')?.name ?? null,
      composer:
        crewBase.find((c) => c.job === 'Original Music Composer' || c.job === 'Music')?.name ??
        null,
    },
    cast: castBase.map((c) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? c.roles?.[0]?.character ?? '',
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
      order: c.order,
    })),
    fullCrew: crewBase.map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
    })),
    videos: (raw.videos?.results ?? [])
      .filter((v: any) => v.site === 'YouTube')
      .map((v: any) => ({
        key: v.key,
        name: v.name,
        type: v.type,
        site: v.site,
        official: v.official ?? false,
      })),
    keywords: raw.keywords?.results?.map((k: any) => k.name) ?? [],
    similar: (raw.similar?.results ?? []).slice(0, 12).map((s: any) => ({
      id: s.id,
      title: s.title ?? s.name ?? '',
      poster_path: s.poster_path ? tmdbImageUrl(s.poster_path) : null,
      vote_average: s.vote_average,
    })),
    externalIds: {
      imdb_id: raw.external_ids?.imdb_id ?? null,
      facebook_id: raw.external_ids?.facebook_id ?? null,
      instagram_id: raw.external_ids?.instagram_id ?? null,
      twitter_id: raw.external_ids?.twitter_id ?? null,
    },
    watchProviders: watchProviderRaw
      ? {
          link: watchProviderRaw.link ?? '',
          flatrate: watchProviderRaw.flatrate?.map((p: any) => ({
            ...p,
            logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
          })),
          rent: watchProviderRaw.rent?.map((p: any) => ({
            ...p,
            logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
          })),
          buy: watchProviderRaw.buy?.map((p: any) => ({
            ...p,
            logo_path: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
          })),
        }
      : null,
    releaseDates: [],
    omdbRatings,
    malScore,
  };
}

// Fallback for MAL-only titles
export async function fetchAnimeByMalId(malId: number, amdbId: string): Promise<ContentDetail> {
  const raw = await getJikanDetails(malId);
  const isOngoing = raw.status === 'Currently Airing';
  return {
    id: amdbId,
    contentType: 'ANIME',
    title: raw.title_english ?? raw.title ?? '',
    originalTitle: raw.title ?? null,
    year: raw.year ?? null,
    posterUrl: raw.images?.jpg?.large_image_url ?? null,
    backdropUrl: null,
    overview: raw.synopsis ?? null,
    tagline: null,
    genres: raw.genres?.map((g: any) => ({ id: g.mal_id, name: g.name })) ?? [],
    status: isOngoing ? 'Ongoing' : (raw.status ?? null),
    imdbId: null,
    tmdbId: null,
    malId: malId,
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
    productionCompanies:
      raw.studios?.map((s: any) => ({ id: s.mal_id, name: s.name, logo_path: null })) ?? [],
    crew: { director: null, writer: null, producer: null, cinematographer: null, composer: null },
    cast:
      raw.characters?.slice(0, 20).map((c: any) => ({
        id: c.character?.mal_id ?? 0,
        name: c.character?.name ?? '',
        character: c.role ?? '',
        profile_path: c.character?.images?.jpg?.image_url ?? null,
        order: 0,
      })) ?? [],
    fullCrew: [],
    videos: raw.trailer?.youtube_id
      ? [
          {
            key: raw.trailer.youtube_id,
            name: 'Trailer',
            type: 'Trailer',
            site: 'YouTube',
            official: true,
          },
        ]
      : [],
    keywords: raw.themes?.map((t: any) => t.name) ?? [],
    similar:
      (
        raw.relations
          ?.filter(
            (r: any) =>
              r.relation === 'Sequel' || r.relation === 'Prequel' || r.relation === 'Side story',
          )
          .flatMap((r: any) => r.entry ?? []) ?? []
      )
        .slice(0, 8)
        .map((e: any) => ({
          id: e.mal_id,
          title: e.name,
          poster_path: null,
          vote_average: 0,
        })) ?? [],
    externalIds: { imdb_id: null, facebook_id: null, instagram_id: null, twitter_id: null },
    watchProviders: null,
    releaseDates: [],
    omdbRatings: [],
    malScore: raw.score ? Number(raw.score.toFixed(1)) : null,
  };
}

export async function fetchMovieCredits(tmdbId: number) {
  const raw = await getTmdbCommon(tmdbId, 'movie', 'credits');
  const crewBase = raw.credits?.crew ?? [];
  const castBase = raw.credits?.cast ?? [];
  return {
    cast: castBase.map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
      order: c.order,
    })),
    fullCrew: crewBase.map((c: any) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
    })),
  };
}

export async function fetchMovieSimilar(tmdbId: number) {
  const raw = await getTmdbCommon(tmdbId, 'movie', 'similar');
  return (raw.results ?? []).slice(0, 12).map((s: any) => ({
    id: s.id,
    title: s.title ?? s.name ?? '',
    poster_path: s.poster_path ? tmdbImageUrl(s.poster_path) : null,
    vote_average: s.vote_average,
  }));
}

export async function fetchTvCredits(tmdbId: number) {
  const raw = await getTmdbCommon(tmdbId, 'tv', 'credits');
  const crewBase = raw.credits?.crew ?? [];
  const castBase = raw.credits?.cast ?? [];
  return {
    cast: castBase.map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character ?? c.roles?.[0]?.character ?? '',
      profile_path: tmdbImageUrl(c.profile_path, 'w185'),
      order: c.order,
    })),
    fullCrew: crewBase.map((c: any) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      department: c.department,
    })),
  };
}

export async function fetchTvSimilar(tmdbId: number) {
  const raw = await getTmdbCommon(tmdbId, 'tv', 'similar');
  return (raw.results ?? []).slice(0, 12).map((s: any) => ({
    id: s.id,
    title: s.title ?? s.name ?? '',
    poster_path: s.poster_path ? tmdbImageUrl(s.poster_path) : null,
    vote_average: s.vote_average,
  }));
}
