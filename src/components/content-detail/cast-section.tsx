import * as React from 'react';
import { fetchMovieCredits, fetchTvCredits } from '@/lib/content-detail';
import { CastSectionClient } from './cast-section-client';

interface CastSectionProps {
  cast: {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
    order: number;
  }[];
}

export function CastSection({ cast }: CastSectionProps) {
  if (!cast?.length) return null;

  return <CastSectionClient cast={cast} />;
}
