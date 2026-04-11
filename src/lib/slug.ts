// Shared slug utility used by all content type routes
// Slug format: /[content-type]/[title-slug]-[id]
// Example: /anime/one-piece-3d6gt, /movie/inception-5e9k2

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

export function buildContentUrl(contentType: string, title: string, id: string | number): string {
  const type = contentType === 'TV_SHOW' ? 'tv' : contentType.toLowerCase();
  return `/${type}/${slugify(title)}-${id}`;
}

/**
 * Parse a slug like "inception-5e9k2" → extract the ID suffix after the last "-"
 * IDs are always alphanumeric Prisma CUIDs or numeric TMDB/MAL IDs.
 */
export function parseSlug(slug: string): { id: string; titleSlug: string } {
  const cleanSlug = slug.trim().replace(/\/+$/, '');
  const lastDash = cleanSlug.lastIndexOf('-');
  if (lastDash === -1) return { id: cleanSlug, titleSlug: '' };
  return {
    id: cleanSlug.slice(lastDash + 1),
    titleSlug: cleanSlug.slice(0, lastDash),
  };
}
