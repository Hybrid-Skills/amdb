'use client';

import Image, { ImageProps } from 'next/image';

/**
 * Next.js Image wrapper for TMDB images.
 * No custom loader — lets Next.js proxy through /_next/image which
 * automatically converts to AVIF/WebP based on browser Accept headers.
 * Posters go from ~250KB JPG → ~30-60KB AVIF.
 */
export default function TmdbImage(props: ImageProps) {
  return <Image {...props} />;
}
