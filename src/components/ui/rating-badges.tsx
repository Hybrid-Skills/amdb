import * as React from 'react';
import { cn } from '@/lib/utils';

export interface Rating {
  Source: string;
  Value: string;
}

interface RatingBadgesProps {
  tmdbRating?: number | null;
  omdbRatings?: Rating[];
  malScore?: number | null;
  className?: string;
}

function formatRatingValue(val: string) {
  return val.split('/')[0].replace('%', '').trim();
}

export function RatingBadges({ tmdbRating, omdbRatings, malScore, className }: RatingBadgesProps) {
  const hasTmdb = typeof tmdbRating === 'number' && tmdbRating > 0;
  const hasOmdb = omdbRatings && omdbRatings.length > 0;
  const hasMal = typeof malScore === 'number' && malScore > 0;
  if (!hasTmdb && !hasOmdb && !hasMal) return null;

  const omdbOrder = ['Internet Movie Database', 'Rotten Tomatoes', 'Metacritic'];
  const sortedOmdb = [...(omdbRatings || [])].sort((a, b) => {
    const idxA = omdbOrder.indexOf(a.Source);
    const idxB = omdbOrder.indexOf(b.Source);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {/* 0. MAL (first, for anime) */}
      {hasMal && (
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-sm">
          <span className="text-[10px] font-black text-blue-400 leading-none uppercase tracking-tight">MAL</span>
          <span className="text-xs font-bold text-white/90">{malScore}</span>
        </div>
      )}

      {/* 1. OMDB (IMDb, RT, MC) */}
      {sortedOmdb.map((r) => {
        let label = r.Source;
        let color = 'text-white/40';

        if (r.Source === 'Internet Movie Database') {
          label = 'IMDb';
          color = 'text-yellow-400';
        } else if (r.Source === 'Rotten Tomatoes') {
          label = 'RT';
          color = 'text-red-500';
        } else if (r.Source === 'Metacritic') {
          label = 'MC';
          color = 'text-green-400';
        }

        return (
          <div key={r.Source} className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-sm">
            <span className={cn("text-[10px] font-black leading-none uppercase tracking-tight", color)}>{label}</span>
            <span className="text-xs font-bold text-white/90">{formatRatingValue(r.Value)}</span>
          </div>
        );
      })}

      {/* 2. TMDB (Last) */}
      {hasTmdb && (
        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 shadow-sm">
          <span className="text-[10px] font-black text-yellow-400 leading-none uppercase tracking-tight">TMDB</span>
          <span className="text-xs font-bold text-white/90">{tmdbRating}</span>
        </div>
      )}
    </div>
  );
}
