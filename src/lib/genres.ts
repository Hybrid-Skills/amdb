/**
 * Build the pipe-delimited genreNames string used for fast B-tree filtering.
 *
 * TMDB combines some genres into single entries like "Action & Adventure" or
 * "Sci-Fi & Fantasy". We split on " & " so that filtering by "Action" or
 * "Adventure" individually both work correctly.
 *
 * Result format: "|Action|Adventure|Animation|" (always pipe-wrapped)
 */
export function buildGenreNames(genres: { name: string }[] | null | undefined): string | null {
  if (!genres || genres.length === 0) return null;

  const parts = genres.flatMap((g) =>
    g.name
      .split(' & ')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  return parts.length > 0 ? `|${parts.join('|')}|` : null;
}
