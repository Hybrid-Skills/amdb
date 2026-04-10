'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { ProfileSwitcherBar } from './profile-switcher-bar';
import { GamificationBadge } from './gamification-badge';
import { YourProfileTab } from './your-profile-tab';
import { StatisticsTab } from './statistics-tab';
import { AwardsTab } from './awards-tab';
import { writeProfileCookie } from '@/lib/profile-cookie';
import { getTier } from '@/lib/gamification';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
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
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [localProfiles, setLocalProfiles] = React.useState<Profile[]>(profiles);
  const activeProfile = localProfiles.find((p) => p.id === activeId) ?? localProfiles[0];
  const canDelete = activeProfile && !activeProfile.isDefault && localProfiles.length > 1;

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

  async function handleDeleteConfirm() {
    if (!activeProfile) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/profiles/${activeProfile.id}`, { method: 'DELETE' });
      if (res.ok) {
        const remaining = localProfiles.filter((p) => p.id !== activeId);
        setLocalProfiles(remaining);
        setDeleteOpen(false);
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
    } finally {
      setDeleting(false);
    }
  }

  const tier = getTier(stats.score);

  const deleteModalContent = (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">Delete "{activeProfile?.name}"?</p>
          <p className="text-xs text-white/40 mt-0.5">All content and stats will be permanently removed.</p>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={() => setDeleteOpen(false)}
          className="flex-1 py-2.5 rounded-xl bg-white/8 text-sm text-white/60 hover:text-white hover:bg-white/12 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleDeleteConfirm}
          disabled={deleting}
          className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete Profile'}
        </button>
      </div>
    </div>
  );

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
        {/* Profile switcher + delete */}
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <ProfileSwitcherBar
              profiles={localProfiles}
              activeId={activeId}
              onSwitch={handleProfileSwitch}
            />
          </div>
          {canDelete && (
            <button
              onClick={() => setDeleteOpen(true)}
              className="shrink-0 p-2 rounded-xl text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Delete profile"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

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
              onUpdate={handleProfileUpdate}
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

      {/* Delete confirmation modal */}
      {isDesktop ? (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white p-0 overflow-hidden [&>button]:hidden">
            <DialogTitle className="sr-only">Delete Profile</DialogTitle>
            {deleteModalContent}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DrawerContent className="bg-zinc-950 border-white/10 text-white">
            <DrawerTitle className="sr-only">Delete Profile</DrawerTitle>
            {deleteModalContent}
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
