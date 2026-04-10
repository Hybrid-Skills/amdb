'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileSwitcherBar } from './profile-switcher-bar';
import { GamificationBadge } from './gamification-badge';
import { YourProfileTab } from './your-profile-tab';
import { StatisticsTab } from './statistics-tab';
import { AwardsTab } from './awards-tab';
import { writeProfileCookie } from '@/lib/profile-cookie';
import { getTier } from '@/lib/gamification';
import type { ProfileStats } from '@/lib/stats';

interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  isDefault: boolean;
}

interface ProfilesShellProps {
  profiles: Profile[];
  initialStats: ProfileStats;
  initialActiveId: string;
}

type Tab = 'profile' | 'stats' | 'awards';

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Your Profile' },
  { id: 'stats', label: 'Statistics' },
  { id: 'awards', label: 'Awards' },
];

export function ProfilesShell({ profiles, initialStats, initialActiveId }: ProfilesShellProps) {
  const [activeId, setActiveId] = React.useState(initialActiveId);
  const [stats, setStats] = React.useState<ProfileStats>(initialStats);
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>('profile');

  // Local profile state for optimistic updates
  const [localProfiles, setLocalProfiles] = React.useState<Profile[]>(profiles);
  const activeProfile = localProfiles.find((p) => p.id === activeId) ?? localProfiles[0];

  async function handleProfileSwitch(profile: Profile) {
    setActiveId(profile.id);
    writeProfileCookie({ ...profile, avatarEmoji: profile.avatarEmoji ?? null });
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/profiles/${profile.id}/stats`);
      if (res.ok) setStats(await res.json());
    } finally {
      setStatsLoading(false);
    }
  }

  function handleProfileUpdate(updates: Partial<Pick<Profile, 'name' | 'avatarColor' | 'avatarEmoji'>>) {
    setLocalProfiles((prev) =>
      prev.map((p) => p.id === activeId ? { ...p, ...updates } : p)
    );
    const updated = { ...activeProfile!, ...updates };
    writeProfileCookie({ ...updated, avatarEmoji: updated.avatarEmoji ?? null });
  }

  function handleProfileDelete() {
    const remaining = localProfiles.filter((p) => p.id !== activeId);
    setLocalProfiles(remaining);
    if (remaining.length > 0) {
      const next = remaining.find((p) => p.isDefault) ?? remaining[0];
      setActiveId(next.id);
      writeProfileCookie({ ...next, avatarEmoji: next.avatarEmoji ?? null });
      setStatsLoading(true);
      fetch(`/api/profiles/${next.id}/stats`)
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setStats(d); })
        .finally(() => setStatsLoading(false));
    }
  }

  const tier = getTier(stats.score);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 text-white/50 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-bold text-white">Profile</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Profile switcher */}
        <ProfileSwitcherBar
          profiles={localProfiles}
          activeId={activeId}
          onSwitch={handleProfileSwitch}
        />

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
        <div className={`transition-opacity duration-200 ${statsLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          {activeTab === 'profile' && activeProfile && (
            <YourProfileTab
              profile={activeProfile}
              userTier={tier}
              totalProfiles={localProfiles.length}
              onUpdate={handleProfileUpdate}
              onDelete={handleProfileDelete}
            />
          )}

          {activeTab === 'stats' && activeProfile && (
            <StatisticsTab
              stats={stats}
              profileId={activeProfile.id}
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
