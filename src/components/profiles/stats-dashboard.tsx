'use client';

import { StatCard } from './stat-card';
import { formatWatchTime } from '@/lib/utils/watch-time';
import type { ProfileStats } from '@/lib/stats';

interface StatsDashboardProps {
  stats: ProfileStats;
}

export function StatsDashboard({ stats }: StatsDashboardProps) {
  const { watched, planned } = stats;

  return (
    <div className="space-y-6">
      {/* Watched */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Watched</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Movies"
            value={watched.MOVIE.count}
            subvalue={
              watched.MOVIE.totalMins > 0 ? formatWatchTime(watched.MOVIE.totalMins) : undefined
            }
            icon="🎬"
            dim={watched.MOVIE.count === 0}
          />
          <StatCard
            label="TV Shows"
            value={watched.TV_SHOW.count}
            subvalue={
              watched.TV_SHOW.totalMins > 0 ? formatWatchTime(watched.TV_SHOW.totalMins) : undefined
            }
            icon="📺"
            dim={watched.TV_SHOW.count === 0}
          />
          <StatCard
            label="Anime"
            value={watched.ANIME.count}
            subvalue={
              watched.ANIME.totalMins > 0 ? formatWatchTime(watched.ANIME.totalMins) : undefined
            }
            icon="🐉"
            dim={watched.ANIME.count === 0}
          />
          <StatCard
            label="Avg Rating"
            value={watched.avgRating !== null ? `${watched.avgRating}/10` : '—'}
            icon="⭐"
            dim={watched.avgRating === null}
          />
          <StatCard
            label="Reviews"
            value={watched.reviewCount}
            subvalue={
              watched.totalCount > 0
                ? `${Math.round((watched.reviewCount / watched.totalCount) * 100)}% rated`
                : undefined
            }
            icon="✍️"
            dim={watched.reviewCount === 0}
          />
          {watched.totalMins > 0 && (
            <StatCard
              label="Total Watch Time"
              value={formatWatchTime(watched.totalMins)}
              subvalue={`${watched.totalCount} titles`}
              icon="⏱️"
            />
          )}
        </div>
      </div>

      {/* Planned */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Planned</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Movies"
            value={planned.MOVIE.count}
            icon="🎬"
            dim={planned.MOVIE.count === 0}
          />
          <StatCard
            label="TV Shows"
            value={planned.TV_SHOW.count}
            icon="📺"
            dim={planned.TV_SHOW.count === 0}
          />
          <StatCard
            label="Anime"
            value={planned.ANIME.count}
            icon="🐉"
            dim={planned.ANIME.count === 0}
          />
          {planned.estimatedMins > 0 && (
            <StatCard
              label="Est. Watch Time"
              value={formatWatchTime(planned.estimatedMins)}
              subvalue={`${planned.totalCount} titles queued`}
              icon="📋"
            />
          )}
        </div>
      </div>
    </div>
  );
}
