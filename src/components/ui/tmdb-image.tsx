import Image, { ImageProps } from 'next/image';

/**
 * Next.js Image wrapper for TMDB images.
 * Optimized to use the Next.js internal image server for edge caching.
 * Automatically prefixes bare TMDB paths with the full URL.
 */
export default function TmdbImage({ src, ...props }: ImageProps) {
  // If we have a bare TMDB path (e.g. /abc.jpg), prefix with the full URL
  // so that the Next.js internal loader can proxy and optimize it.
  let finalSrc = src;
  if (typeof src === 'string' && src.startsWith('/') && !src.startsWith('//')) {
    finalSrc = `https://image.tmdb.org/t/p/original${src}`;
  }

  return <Image src={finalSrc} {...props} />;
}
