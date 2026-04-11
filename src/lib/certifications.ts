/**
 * Extracts a map of { [iso_3166_1]: certification } from TMDB raw data.
 * Works for both movies (release_dates) and TV/anime (content_ratings).
 */
export function extractAllCertifications(
  raw: any,
  contentType: 'MOVIE' | 'TV_SHOW' | 'ANIME',
): Record<string, string> {
  const map: Record<string, string> = {};

  if (contentType === 'MOVIE') {
    const results: { iso_3166_1: string; release_dates: { certification: string }[] }[] =
      raw.release_dates?.results ?? [];
    for (const entry of results) {
      const cert = entry.release_dates?.find((d) => d.certification)?.certification;
      if (cert) map[entry.iso_3166_1] = cert;
    }
  } else {
    const results: { iso_3166_1: string; rating: string }[] =
      raw.content_ratings?.results ?? [];
    for (const entry of results) {
      if (entry.rating) map[entry.iso_3166_1] = entry.rating;
    }
  }

  return map;
}

/**
 * Picks the best certification to display for a given locale.
 * Priority: requested locale → IN → US → first available → null
 */
export function getDisplayCertification(
  contentRatings: Record<string, string> | null | undefined,
  locale = 'IN',
): string | null {
  if (!contentRatings || Object.keys(contentRatings).length === 0) return null;
  return (
    contentRatings[locale] ??
    contentRatings['IN'] ??
    contentRatings['US'] ??
    Object.values(contentRatings)[0] ??
    null
  );
}
