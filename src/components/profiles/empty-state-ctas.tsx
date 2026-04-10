'use client';

import Link from 'next/link';
import type { ProfileStats } from '@/lib/stats';

interface EmptyStateCTAsProps {
  stats: ProfileStats;
}

export function EmptyStateCTAs({ stats }: EmptyStateCTAsProps) {
  const hasWatched = stats.watched.totalCount > 0;
  const hasPlanned = stats.planned.totalCount > 0;
  const hasReviews = stats.watched.reviewCount > 0;

  const ctas: { label: string; description: string; icon: string; href: string }[] = [];

  if (!hasWatched) {
    ctas.push({
      label: 'Add your first title',
      description: "Start tracking movies, shows, or anime you've watched.",
      icon: '🎬',
      href: '/',
    });
  }

  if (hasWatched && !hasPlanned) {
    ctas.push({
      label: 'Plan something to watch',
      description: 'Build your watchlist and never run out of things to watch.',
      icon: '📋',
      href: '/?tab=planned',
    });
  }

  if (hasWatched && !hasReviews) {
    ctas.push({
      label: 'Leave your first review',
      description: 'Rate titles and add notes to track your thoughts.',
      icon: '✍️',
      href: '/',
    });
  }

  if (ctas.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-widest text-white/30">Get Started</h3>
      {ctas.map((cta) => (
        <Link
          key={cta.label}
          href={cta.href}
          className="flex items-center gap-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/8 p-4 transition-colors group"
        >
          <span className="text-3xl">{cta.icon}</span>
          <div>
            <p className="font-bold text-white group-hover:text-white text-sm">{cta.label}</p>
            <p className="text-xs text-white/40 mt-0.5">{cta.description}</p>
          </div>
          <span className="ml-auto text-white/20 group-hover:text-white/50 transition-colors">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
