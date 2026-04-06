const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export const tmdbImageUrl = (path: string | null, size = 'w500') =>
  path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;

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
      append_to_response: 'credits,videos,similar,release_dates',
    }),

  tvDetails: (id: number) =>
    tmdbFetch<TmdbMovieDetails>(`/tv/${id}`, {
      append_to_response: 'credits,videos,similar,content_ratings',
    }),

  genres: () => tmdbFetch<{ genres: { id: number; name: string }[] }>('/genre/movie/list'),

  discover: (params: Record<string, string>) =>
    tmdbFetch<TmdbSearchResponse>('/discover/movie', params),
};
