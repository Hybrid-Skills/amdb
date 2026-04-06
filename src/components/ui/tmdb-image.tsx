'use client';

import Image, { ImageProps } from 'next/image';
import { tmdbImageLoader } from '@/lib/tmdb';

interface TmdbImageProps extends Omit<ImageProps, 'loader'> {
  // Add any additional props if needed, but for now we just want to wrap Next.js Image
}

/**
 * A Client Component wrapper for Next.js Image that uses the TMDB loader.
 * This avoids "Functions cannot be passed directly to Client Components" errors
 * when used from Server Components.
 */
export default function TmdbImage(props: TmdbImageProps) {
  return <Image {...props} loader={tmdbImageLoader} />;
}
