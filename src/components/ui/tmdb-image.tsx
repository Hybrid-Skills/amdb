'use client';

import Image, { ImageProps } from 'next/image';
import { tmdbImageLoader } from '@/lib/tmdb';

/**
 * Next.js Image wrapper for TMDB images.
 * Uses a custom loader to map bare TMDB paths to their full URLs
 * while allowing Next.js to handle optimization.
 */
export default function TmdbImage(props: ImageProps) {
  return <Image loader={tmdbImageLoader} {...props} />;
}
