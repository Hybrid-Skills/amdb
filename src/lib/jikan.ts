const JIKAN_BASE = 'https://api.jikan.moe/v4';

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  images: { jpg: { image_url: string; large_image_url: string } };
  score: number | null;
  scored_by: number | null;
  members: number | null;
  year: number | null;
  synopsis: string | null;
  genres: { mal_id: number; name: string }[];
  themes?: { mal_id: number; name: string }[];
  episodes: number | null;
  status: string;
  duration?: string | number | null;
  rating?: string | null;
  studios?: { mal_id: number; name: string }[];
  broadcast?: { string: string | null };
  trailer?: { url: string | null; youtube_id: string | null };
  aired?: { from: string | null; to: string | null; string?: string };
  characters?: {
    character: { mal_id: number; name: string; images: { jpg: { image_url: string } } };
    role: string;
  }[];
  relations?: {
    relation: string;
    entry: { mal_id: number; name: string; type: string }[];
  }[];
}

export interface JikanSearchResponse {
  data: JikanAnime[];
  pagination: { last_visible_page: number; has_next_page: boolean };
}

export async function searchJikan(query: string, page = 1) {
  const url = new URL(`${JIKAN_BASE}/anime`);
  url.searchParams.set('q', query);
  url.searchParams.set('page', String(page));
  url.searchParams.set('limit', '20');
  url.searchParams.set('sfw', 'true');

  // Jikan rate limits: 3 req/sec, 60/min
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);

  const json = (await res.json()) as JikanSearchResponse;

  return {
    results: json.data.map((a) => ({
      malId: a.mal_id,
      title: a.title_english ?? a.title,
      year: a.year,
      posterUrl: a.images.jpg.large_image_url,
      tmdbRating: a.score,
      overview: a.synopsis,
      contentType: 'ANIME' as const,
      genres: a.genres.map((g) => ({ id: g.mal_id, name: g.name })),
    })),
    totalPages: Math.min(json.pagination.last_visible_page, 20),
  };
}

export async function getJikanDetails(malId: number): Promise<JikanAnime> {
  const res = await fetch(`${JIKAN_BASE}/anime/${malId}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  const json = await res.json();
  return json.data as JikanAnime;
}
