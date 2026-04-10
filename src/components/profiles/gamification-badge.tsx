'use client';

import { getTier, getNextTier, TIERS, type Tier } from '@/lib/gamification';

interface GamificationBadgeProps {
  score: number;
}

export function GamificationBadge({ score }: GamificationBadgeProps) {
  const tier = getTier(score);
  const next = getNextTier(tier);

  const progressToNext = next
    ? Math.min(100, Math.round(((score - tier.minScore) / (next.minScore - tier.minScore)) * 100))
    : 100;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-5">
      {/* Current tier */}
      <div className="flex items-center gap-3 mb-4">
        <span
          className={`text-4xl ${tier.glow ? 'drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]' : ''}`}
        >
          {tier.emoji}
        </span>
        <div>
          <p className="text-lg font-black text-white">{tier.name}</p>
          <p className="text-xs text-white/40">Score: {score}</p>
        </div>
      </div>

      {/* Progress bar */}
      {next ? (
        <div>
          <div className="flex justify-between text-[11px] text-white/40 mb-1.5">
            <span>{tier.name}</span>
            <span>
              {next.emoji} {next.name} at {next.minScore}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressToNext}%`, backgroundColor: tier.color }}
            />
          </div>
          <p className="text-[11px] text-white/30 mt-1.5">
            {next.minScore - score} more to unlock{' '}
            <span style={{ color: next.color }}>{next.name}</span>
          </p>
        </div>
      ) : (
        <p className="text-xs text-cyan-400/60">You&apos;ve reached the highest tier 👑</p>
      )}

      {/* All tiers */}
      <div className="flex gap-2 mt-4">
        {TIERS.map((t: Tier) => (
          <div
            key={t.level}
            title={`${t.name} (${t.minScore}+)`}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-sm transition-all ${
              t.level <= tier.level ? 'opacity-100' : 'opacity-20 grayscale'
            }`}
            style={{ backgroundColor: t.level <= tier.level ? t.color + '33' : undefined }}
          >
            {t.emoji}
          </div>
        ))}
      </div>
    </div>
  );
}
