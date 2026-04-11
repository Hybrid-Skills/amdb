'use client';

import * as React from 'react';
import Link from 'next/link';
import { Home, Share2, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ProfileOverviewCard } from './profile-overview-card';
import { RatedListTab } from './rated-list-tab';
import { StatisticsTab } from './statistics-tab';
import { AwardsTab } from './awards-tab';
import { AWARDS } from '@/lib/awards';
import type { ProfileStats } from '@/lib/stats';

interface ProfileUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  avatarColor: string;
  avatarEmoji: string | null;
}

interface RatedItem {
  id: string;
  title: string;
  year: number | null;
  rating: number;
}

interface ProfilePageShellProps {
  profileUser: ProfileUser;
  isOwner: boolean;
  stats: ProfileStats;
  initialRatedItems: RatedItem[];
  initialHasMore: boolean;
}

type Tab = 'stats' | 'list' | 'awards';

export function ProfilePageShell({
  profileUser,
  isOwner,
  stats,
  initialRatedItems,
  initialHasMore,
}: ProfilePageShellProps) {
  const { update: updateSession } = useSession();
  const [activeTab, setActiveTab] = React.useState<Tab>('list');
  const [currentUser, setCurrentUser] = React.useState(profileUser);
  const [shared, setShared] = React.useState(false);

  async function handleShare() {
    const url = window.location.href;
    const shareData = {
      title: `${currentUser.name} on AMDB`,
      text: `Check out ${currentUser.name}'s movie and TV ratings on AMDB`,
      url,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  }

  const [ratedItems, setRatedItems] = React.useState(initialRatedItems);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [loadingMore, setLoadingMore] = React.useState(false);

  // Sync state if server data changes
  React.useEffect(() => {
    setCurrentUser(profileUser);
  }, [profileUser]);

  // Handle loading more entries
  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      const offset = ratedItems.length;
      const res = await fetch(`/api/user/${profileUser.id}/rated?offset=${offset}&limit=12`);
      if (!res.ok) throw new Error('Failed to fetch more items');
      
      const data = await res.json();
      setRatedItems(prev => [...prev, ...data.items]);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleProfileUpdate(updates: {
    name?: string;
    username?: string;
    avatarColor?: string;
    avatarEmoji?: string | null;
  }) {
    const res = await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to update profile');
    }

    setCurrentUser((prev) => ({ ...prev, ...updates }));
    await updateSession();
  }

  const unlockedAwardIds = React.useMemo(
    () => new Set(AWARDS.filter((a) => a.isUnlocked(stats)).map((a) => a.id)),
    [stats],
  );

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'list', label: 'List', count: ratedItems.length },
    { id: 'stats', label: 'Stats' },
    { id: 'awards', label: 'Awards', count: unlockedAwardIds.size },
  ];

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 w-full bg-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 text-white/40 hover:text-white transition-colors">
              <Home className="w-5 h-5" />
            </Link>
            <h1 className="text-sm font-black text-white uppercase tracking-widest truncate max-w-[150px]">
              {currentUser.name}
            </h1>
          </div>
          <button
            onClick={handleShare}
            className="p-2 text-white/40 hover:text-white transition-colors"
            aria-label="Share profile"
          >
            {shared ? <Check className="w-5 h-5 text-green-400" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-8 space-y-10">
        {/* Profile Card */}
        <ProfileOverviewCard
          user={currentUser}
          score={stats.score}
          isOwner={isOwner}
          unlockedAwardIds={unlockedAwardIds}
          onUpdate={handleProfileUpdate}
        />

        {/* Navigation Tabs */}
        <div className="space-y-6">
          <div className="flex gap-1 p-1 bg-white/[0.03] border border-white/10 rounded-2xl">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all
                  ${
                    activeTab === tab.id
                      ? 'bg-white text-black shadow-lg shadow-white/10'
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-black/10 text-black' : 'bg-white/10 text-white/40'}`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="min-h-[400px]">
            {activeTab === 'list' && (
              <RatedListTab 
                items={ratedItems} 
                profileName={currentUser.name} 
                hasMore={hasMore}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
              />
            )}
            {activeTab === 'stats' && <StatisticsTab stats={stats} />}
            {activeTab === 'awards' && <AwardsTab stats={stats} />}
          </div>
        </div>
      </main>
    </div>
  );
}
