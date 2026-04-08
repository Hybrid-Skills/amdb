/**
 * TMDB uses inconsistent genre names across movies vs TV/anime:
 *   Movies:   "Science Fiction", "War"
 *   TV/Anime: "Sci-Fi & Fantasy" → split → "Sci-Fi", "Fantasy"
 *             "Action & Adventure" → split → "Action", "Adventure"
 *             "War & Politics" → split → "War", "Politics"
 *
 * Normalize to canonical names so filters work across all content types.
 */
const GENRE_ALIASES: Record<string, string> = {
  'Science Fiction': 'Sci-Fi',
  'Politics': 'War & Politics', // keep compound split for now, just normalize sci-fi
};

// Normalize a single split token to its canonical form
function normalize(name: string): string {
  return GENRE_ALIASES[name] ?? name;
}

/**
 * Build the pipe-delimited genreNames string used for fast B-tree filtering.
 *
 * TMDB combines some genres into single entries like "Action & Adventure" or
 * "Sci-Fi & Fantasy". We split on " & " so that filtering by "Action" or
 * "Adventure" individually both work correctly.
 *
 * Result format: "|Action|Adventure|Sci-Fi|" (always pipe-wrapped, normalized)
 */
export function buildGenreNames(genres: { name: string }[] | null | undefined): string | null {
  if (!genres || genres.length === 0) return null;

  const parts = genres.flatMap((g) =>
    g.name
      .split(' & ')
      .map((s) => normalize(s.trim()))
      .filter(Boolean),
  );

  return parts.length > 0 ? `|${parts.join('|')}|` : null;
}

/** Canonical genre list shown in the filter UI */
export const GENRE_LIST = [
  'Action',
  'Adventure',
  'Animation',
  'Comedy',
  'Crime',
  'Documentary',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Thriller',
  'War',
  'Western',
] as const;
