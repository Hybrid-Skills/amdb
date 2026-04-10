'use client';

import { AWARDS, CATEGORY_LABELS, type AwardCategory } from '@/lib/awards';
import { AwardBadge } from './award-badge';
import type { ProfileStats } from '@/lib/stats';

interface AwardsTabProps {
  stats: ProfileStats;
}

const CATEGORY_ORDER: AwardCategory[] = [
  'milestone',
  'movies',
  'tv',
  'anime',
  'reviews',
  'watchtime',
];

export function AwardsTab({ stats }: AwardsTabProps) {
  const unlockedIds = new Set(AWARDS.filter((a) => a.isUnlocked(stats)).map((a) => a.id));
  const totalUnlocked = unlockedIds.size;

  const byCategory = CATEGORY_ORDER.map((cat) => ({
    cat,
    awards: AWARDS.filter((a) => a.category === cat),
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">
          <span className="text-white font-bold">{totalUnlocked}</span> / {AWARDS.length} unlocked
        </p>
        <div className="h-1.5 flex-1 mx-4 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${(totalUnlocked / AWARDS.length) * 100}%` }}
          />
        </div>
      </div>

      {byCategory.map(({ cat, awards }) => (
        <div key={cat}>
          <h3 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4">
            {CATEGORY_LABELS[cat]}
          </h3>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
            {awards.map((award) => (
              <AwardBadge key={award.id} award={award} unlocked={unlockedIds.has(award.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
