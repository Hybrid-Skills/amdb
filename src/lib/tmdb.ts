const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const tmdbImageUrl = (path: string | null, size = 'w500') =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

/**
 * Next.js Custom Image Loader for TMDB
 * Maps requested widths to the nearest TMDB size bucket.
 */
export function tmdbImageLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  // Resolve size bucket first so it's available for all return paths
  let size = 'w500';
  if (width <= 92) size = 'w92';
  else if (width <= 154) size = 'w154';
  else if (width <= 185) size = 'w185';
  else if (width <= 342) size = 'w342';
  else if (width <= 500) size = 'w500';
  else if (width <= 780) size = 'w780';
  else if (width <= 1280) size = 'w1280';
  else size = 'original';

  // src is already a full TMDB URL or a path. If it's a full URL, extract the bare path.
  const path = src.includes('image.tmdb.org') ? src.split('/t/p/')[1].split('/').slice(1).join('/') : src;

  // External non-TMDB URL — return as-is
  if (!path || path.startsWith('http')) return src;
  // Raw TMDB path like /abc123.jpg (logo_path, poster_path, etc.) — build full URL
  if (path.startsWith('/')) return `${TMDB_IMAGE_BASE}/${size}${path}`;

  return `${TMDB_IMAGE_BASE}/${size}/${path}`;
}

/**
 * Force-replaces w500 with w342 in a TMDB URL for immediate mobile optimization.
 */
export function optimizeTmdbUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace('/w500/', '/w342/');
}
async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', process.env.TMDB_API_KEY!);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface TmdbSearchResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  media_type?: string;
  genre_ids: number[];
}

export interface TmdbMovieDetails extends TmdbSearchResult {
  tagline: string;
  genres: { id: number; name: string }[];
  runtime: number;
  status: string;
  imdb_id: string;
  budget?: number;
  revenue?: number;
  adult?: boolean;
  popularity?: number;
  spoken_languages?: { english_name: string; iso_639_1: string; name: string }[];
  production_companies?: { id: number; name: string; logo_path: string | null }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  first_air_date?: string;
  last_air_date?: string;
  networks?: { id: number; name: string; logo_path: string | null }[];
  credits?: {
    crew: { id: number; name: string; job: string }[];
    cast: { id: number; name: string; character: string; profile_path: string | null }[];
  };
  similar?: {
    results: TmdbSearchResult[];
  };
  videos?: {
    results: { id: string; name: string; key: string; site: string; type: string }[];
  };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
  content_ratings?: {
    results: { iso_3166_1: string; rating: string }[];
  };
}

export interface TmdbSearchResponse {
  results: TmdbSearchResult[];
  page: number;
  total_pages: number;
  total_results: number;
}

export const tmdb = {
  searchMulti: (query: string, page = 1) =>
    tmdbFetch<TmdbSearchResponse>('/search/multi', {
      query,
      page: String(page),
      include_adult: 'false',
    }),

  searchMovies: (query: string, page = 1) =>
    tmdbFetch<TmdbSearchResponse>('/search/movie', {
      query,
      page: String(page),
    }),

  searchTv: (query: string, page = 1) =>
    tmdbFetch<TmdbSearchResponse>('/search/tv', {
      query,
      page: String(page),
    }),

  movieDetails: (id: number) =>
    tmdbFetch<TmdbMovieDetails>(`/movie/${id}`, {
      append_to_response: 'credits,videos,similar,release_dates,watch/providers',
    }),

  tvDetails: (id: number) =>
    tmdbFetch<TmdbMovieDetails>(`/tv/${id}`, {
      append_to_response: 'credits,videos,similar,content_ratings,watch/providers,external_ids',
    }),

  // Dedicated lightweight endpoints — avoids fetching full details just for providers
  movieWatchProviders: (id: number) =>
    tmdbFetch<{ results: Record<string, any> }>(`/movie/${id}/watch/providers`),

  tvWatchProviders: (id: number) =>
    tmdbFetch<{ results: Record<string, any> }>(`/tv/${id}/watch/providers`),

  genres: () => tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),

  discover: (params: Record<string, string>) =>
    tmdbFetch<TmdbSearchResponse>('/discover/movie', params),
};
