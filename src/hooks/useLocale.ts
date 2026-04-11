'use client';

import * as React from 'react';

/**
 * Derives an ISO 3166-1 alpha-2 country code from navigator.language.
 * "en-IN" → "IN", "en-US" → "US", "en" → "IN" (default)
 */
export function useLocale(defaultLocale = 'IN'): string {
  const [locale, setLocale] = React.useState(defaultLocale);

  React.useEffect(() => {
    const lang = navigator.language ?? '';
    const parts = lang.split('-');
    const country = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : null;
    if (country && country.length === 2) setLocale(country);
  }, []);

  return locale;
}
