'use client';

import { EmptyStateCTAs } from './empty-state-ctas';
import { StatsDashboard } from './stats-dashboard';
import { ActivityChart } from './activity-chart';
import type { ProfileStats } from '@/lib/stats';

interface StatisticsTabProps {
  stats: ProfileStats;
  profileId: string;
}

export function StatisticsTab({ stats, profileId }: StatisticsTabProps) {
  return (
    <div className="space-y-6">
      <EmptyStateCTAs stats={stats} />
      <ActivityChart profileId={profileId} />
      <StatsDashboard stats={stats} />
    </div>
  );
}
