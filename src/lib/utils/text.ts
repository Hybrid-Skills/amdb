/**
 * Generates a concise short description from a longer text (overview/synopsis).
 * Prioritizes the first complete sentence, adds a second if the first is too brief,
 * and truncates at a word boundary if necessary.
 */
export function getShortDescription(text: string | null | undefined): string | null {
  if (!text) return null;

  // Clean common metadata tags (especially from Jikan/MAL)
  const cleaned = text
    .replace(/\[Written by MAL\]|\(Source: .*\)/gi, '')
    .replace(/\r?\n|\r/g, ' ') // Flatten newlines
    .trim();

  if (!cleaned) return null;

  // Split into sentences using a regex that handles common punctuation
  // Matches text followed by . ! or ? and a space or end of string
  const sentenceRegex = /[^\.!\?]+[\.!\?]+(?=\s|$)/g;
  const sentences = cleaned.match(sentenceRegex) || [cleaned];

  let result = sentences[0];

  // If the first sentence is quite short (< 60 chars), try to append the second sentence for context
  if (result.length < 60 && sentences.length > 1) {
    const combined = result + ' ' + sentences[1];
    // Only use the combined version if it's not excessively long
    if (combined.length <= 200) {
      result = combined;
    }
  }

  // Final length guard: Truncate at word boundary near 160 chars if still too long
  if (result.length > 180) {
    result = result.substring(0, 160).split(' ').slice(0, -1).join(' ').trim() + '...';
  }

  return result.trim();
}
