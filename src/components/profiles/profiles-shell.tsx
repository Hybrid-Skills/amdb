'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileSwitcherBar } from './profile-switcher-bar';
import { AvatarEditor } from './avatar-editor';
import { NameEditor } from './name-editor';
import { StatsDashboard } from './stats-dashboard';
import { GamificationBadge } from './gamification-badge';
import { EmptyStateCTAs } from './empty-state-ctas';
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

export function ProfilesShell({ profiles, initialStats, initialActiveId }: ProfilesShellProps) {
  const [activeId, setActiveId] = React.useState(initialActiveId);
  const [stats, setStats] = React.useState<ProfileStats>(initialStats);
  const [statsLoading, setStatsLoading] = React.useState(false);

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

  function handleAvatarUpdate(color: string, emoji: string | null) {
    setLocalProfiles((prev) =>
      prev.map((p) => p.id === activeId ? { ...p, avatarColor: color, avatarEmoji: emoji } : p)
    );
    if (activeProfile) {
      writeProfileCookie({ ...activeProfile, avatarColor: color, avatarEmoji: emoji });
    }
  }

  function handleNameUpdate(name: string) {
    setLocalProfiles((prev) =>
      prev.map((p) => p.id === activeId ? { ...p, name } : p)
    );
    if (activeProfile) {
      writeProfileCookie({ ...activeProfile, name });
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

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Profile switcher */}
        <ProfileSwitcherBar
          profiles={localProfiles}
          activeId={activeId}
          onSwitch={handleProfileSwitch}
        />

        {/* Profile identity */}
        {activeProfile && (
          <div className="flex items-center gap-4">
            <AvatarEditor
              name={activeProfile.name}
              avatarColor={activeProfile.avatarColor}
              avatarEmoji={activeProfile.avatarEmoji}
              userTier={tier}
              profileId={activeProfile.id}
              onUpdate={handleAvatarUpdate}
            />
            <div>
              <NameEditor
                name={activeProfile.name}
                profileId={activeProfile.id}
                onUpdate={handleNameUpdate}
              />
              <p className="text-sm text-white/40 mt-0.5">
                {activeProfile.isDefault ? 'Default profile' : 'Profile'}
              </p>
            </div>
          </div>
        )}

        {/* Gamification */}
        <GamificationBadge score={stats.score} />

        {/* Stats */}
        <div className={`transition-opacity duration-300 ${statsLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
          <StatsDashboard stats={stats} />
        </div>

        {/* Empty state CTAs */}
        <EmptyStateCTAs stats={stats} />
      </div>
    </div>
  );
}
