'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GamificationBadge } from './gamification-badge';
import { YourProfileTab } from './your-profile-tab';
import { StatisticsTab } from './statistics-tab';
import { AwardsTab } from './awards-tab';
import { getTier } from '@/lib/gamification';
import { AWARDS } from '@/lib/awards';
import type { ProfileStats } from '@/lib/stats';

interface UserData {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
}

interface ProfilesShellProps {
  user: UserData;
  initialStats: ProfileStats;
}

type Tab = 'profile' | 'stats' | 'awards';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Your Profile' },
  { id: 'stats', label: 'Statistics' },
  { id: 'awards', label: 'Awards' },
];

export function ProfilesShell({ user, initialStats }: ProfilesShellProps) {
  const [stats, setStats] = React.useState<ProfileStats>(initialStats);
  const [activeTab, setActiveTab] = React.useState<Tab>('profile');
  const [localUser, setLocalUser] = React.useState<UserData>(user);

  function handleUserUpdate(updates: Partial<Pick<UserData, 'name' | 'avatarColor' | 'avatarEmoji'>>) {
    setLocalUser((prev) => ({ ...prev, ...updates }));
  }

  const tier = getTier(stats.score);
  const unlockedAwardIds = React.useMemo(
    () => new Set(AWARDS.filter((a) => a.isUnlocked(stats)).map((a) => a.id)),
    [stats]
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-bold text-white">Account</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Gamification badge */}
        <GamificationBadge score={stats.score} />

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === 'profile' && (
            <YourProfileTab
              profile={localUser}
              userTier={tier}
              unlockedAwardIds={unlockedAwardIds}
              onUpdate={handleUserUpdate}
            />
          )}

          {activeTab === 'stats' && (
            <StatisticsTab
              stats={stats}
            />
          )}

          {activeTab === 'awards' && (
            <AwardsTab stats={stats} />
          )}
        </div>
      </div>
    </div>
  );
}
