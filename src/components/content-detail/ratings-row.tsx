import * as React from 'react';
import { RatingBadges } from '../ui/rating-badges';
import type { ContentDetail } from '@/lib/content-detail';

interface RatingsRowProps {
  data: ContentDetail;
}

export function RatingsRow({ data }: RatingsRowProps) {
  const hasExtraMetrics = data.tmdbVoteCount || data.popularity;

  return (
    <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-1.5">
      <RatingBadges 
        tmdbRating={data.tmdbRating} 
        omdbRatings={data.omdbRatings}
        malScore={data.malScore}
      />

      {hasExtraMetrics && (
        <div className="flex items-center gap-6 md:border-l border-white/10 md:pl-6 py-1">
          {data.tmdbVoteCount && (
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Votes</span>
              <span className="text-xs font-semibold text-white/60">{(data.tmdbVoteCount / 1000).toFixed(1)}k</span>
            </div>
          )}
          {data.popularity && (
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/30">Popularity</span>
              <span className="text-xs font-semibold text-white/60">{data.popularity.toFixed(0)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
