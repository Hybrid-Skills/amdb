/**
 * Shared utilities for watch provider data.
 */

export function getProviderSearchUrl(providerName: string, title: string, defaultUrl: string) {
  const query = encodeURIComponent(title);
  const name = providerName.toLowerCase();

  // Search patterns for major global/IN services
  if (name.includes('netflix')) return `https://www.netflix.com/search?q=${query}`;
  // Handle Amazon Video and Amazon Channels (e.g., "Crunchyroll Amazon Channel")
  if (name.includes('amazon') || name.includes('prime'))
    return `https://www.primevideo.com/search?phrase=${query}`;
  if (name.includes('disney') || name.includes('hotstar'))
    return `https://www.hotstar.com/in/explore?search_query=${query}`;
  if (name.includes('apple') && name.includes('tv'))
    return `https://tv.apple.com/search?term=${query}`;
  if (name.includes('google') || name.includes('youtube'))
    return `https://www.youtube.com/results?search_query=${query}`;
  if (name.includes('max') || name.includes('hbo')) return `https://www.max.com/search/${query}`;
  if (name.includes('hulu')) return `https://www.hulu.com/search?q=${query}`;
  if (name.includes('mubi')) return `https://mubi.com/search/films?query=${query}`;
  if (name.includes('crunchyroll')) return `https://www.crunchyroll.com/search?q=${query}`;
  if (name.includes('jiocinema')) return `https://www.jiocinema.com/search/${query}`;
  if (name.includes('zee5')) return `https://www.zee5.com/search?q=${query}`;
  if (name.includes('sony') && name.includes('liv'))
    return `https://www.sonyliv.com/search?query=${query}`;

  return defaultUrl;
}

export function uniqueProviders(providers: any[] = []) {
  const seen = new Set();
  return providers.filter((p) => {
    // Normalize name to catch "Service" vs "Service with Ads"
    const normalizedName = p.provider_name
      .toLowerCase()
      .replace(/ with ads$/i, '')
      .replace(/ subscription$/i, '')
      .trim();

    if (seen.has(normalizedName)) return false;
    seen.add(normalizedName);
    return true;
  });
}
