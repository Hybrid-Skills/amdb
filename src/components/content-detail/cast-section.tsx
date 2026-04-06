import * as React from 'react';
import { fetchMovieCredits, fetchTvCredits } from '@/lib/content-detail';
import { CastSectionClient } from './cast-section-client';

interface CastSectionProps {
  tmdbId: number;
  contentType: 'MOVIE' | 'TV_SHOW' | 'ANIME';
}

export async function CastSection({ tmdbId, contentType }: CastSectionProps) {
  const credits = contentType === 'MOVIE' 
    ? await fetchMovieCredits(tmdbId) 
    : await fetchTvCredits(tmdbId);
  
  const cast = credits.cast;
  if (!cast?.length) return null;

  return <CastSectionClient cast={cast} />;
}
