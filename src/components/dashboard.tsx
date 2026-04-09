'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { ProfileDropdown } from './profile-dropdown';
import { type Profile } from './profile-selector';
import Image from 'next/image';
import { SearchBar } from './search-bar';
import { AddToListModal, type SearchResult } from './add-to-list-modal';
import { MovieCard } from './movie-card';
import { RecommendationsTab } from './recommendations-tab';
import { PlannedTab } from './planned-tab';
import { ListFilterBar, DEFAULT_FILTERS, type ListFilters } from './list-filter-bar';
import { AnimatePresence, motion } from 'framer-motion';
import { List, Sparkles, Bookmark } from 'lucide-react';
import { EmptyStateIllustration } from './ui/empty-state-illustration';

type DashTab = 'watched' | 'planned' | 'recommendations';

interface ListItem {
  id: string;
  userRating: number;
  notes: string | null;
  watchStatus: string | null;
  watchedDate: string | null;
  startDate: string | null;
  endDate: string | null;
  episodeCount: number | null;
  content: {
    id: string;
    title: string;
    year: number | null;
    posterUrl: string | null;
    backdropUrl?: string | null;
    tagline?: string | null;
    genres?: unknown;
    tmdbRating: number | null;
    contentType: string;
    adult?: boolean | null;
    revenue?: number | null;
    languages?: unknown;
    seasons?: number | null;
    episodes?: number | null;
    networks?: unknown;
    episodeRuntime?: number | null;
    runtimeMins?: number | null;
    omdbRatings?: { Source: string; Value: string }[];
    imdbRating?: string | null;
    ageCertification?: string | null;
    tmdbId?: number | null;
    malId?: number | null;
  };
}

interface DashboardProps {
  userName: string;
}

export function Dashboard(_: DashboardProps) {
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = React.useState<string>('');
  const [activeTab, setActiveTab] = React.useState<DashTab>('watched');

  const [selectedItem, setSelectedItem] = React.useState<SearchResult | null>(null);
  const [selectedItemMeta, setSelectedItemMeta] = React.useState<{
    rating?: number;
    notes?: string | null;
    watchStatus?: string | null;
  }>({});
  const [modalForceEdit, setModalForceEdit] = React.useState(false);
  const [recommendationsRefreshTrigger, setRecommendationsRefreshTrigger] = React.useState(0);

  const [listItems, setListItems] = React.useState<ListItem[]>([]);
  const [listLoading, setListLoading] = React.useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [filters, setFilters] = React.useState<ListFilters>(DEFAULT_FILTERS);
  const [debouncedFilters, setDebouncedFilters] = React.useState<ListFilters>(DEFAULT_FILTERS);

  async function fetchProfiles() {
    const res = await fetch('/api/profiles');
    if (res.ok) {
      const data = await res.json();
      setProfiles(data);
    }
  }

  async function fetchList(profileId: string, p: number, f: ListFilters) {
    setListLoading(true);
    const params = new URLSearchParams({
      profileId,
      page: String(p),
      sortBy: f.sortBy,
      sortOrder: f.sortOrder,
      minRating: String(f.minRating),
      maxRating: String(f.maxRating),
    });
    if (f.contentType !== 'ALL') params.set('contentType', f.contentType);
    if (f.watchStatus.length > 0) params.set('watchStatus', f.watchStatus.join(','));
    if (f.genres.length > 0) params.set('genres', f.genres.join(','));

    const res = await fetch(`/api/list?${params}`);
    if (res.ok) {
      const data = await res.json();
      setListItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setPage(p);
    }
    setListLoading(false);
  }

  // Track which profileId was already fetched on mount to avoid double-fetch
  const prefetchedProfileId = React.useRef<string | null>(null);

  // On mount: fire profiles + list in parallel using cookie profileId
  React.useEffect(() => {
    const cookieProfileId = document.cookie
      .split('; ')
      .find((c) => c.startsWith('amdb_profile_id='))
      ?.split('=')[1] ?? null;

    // Fire both in parallel if cookie exists
    const listPromise = cookieProfileId ? fetchList(cookieProfileId, 1, filters) : Promise.resolve();
    if (cookieProfileId) prefetchedProfileId.current = cookieProfileId;

    fetch('/api/profiles')
      .then((r) => r.json() as Promise<Profile[]>)
      .then((data) => {
        setProfiles(data);
        const resolved =
          (cookieProfileId && data.find((p) => p.id === cookieProfileId)) ??
          data.find((p) => p.isDefault) ??
          data[0];
        if (resolved) setActiveProfileId(resolved.id);
      })
      .catch(() => setListLoading(false));

    void listPromise;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce filter changes — 500ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedFilters(filters), 500);
    return () => clearTimeout(t);
  }, [filters]);

  // Fetch list on profile or debounced filter change
  React.useEffect(() => {
    if (!activeProfileId) return;
    document.cookie = `amdb_profile_id=${activeProfileId}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    localStorage.setItem('amdb_last_profile_id', activeProfileId);
    // Skip initial fetch if mount already handled this profileId with default filters
    if (prefetchedProfileId.current === activeProfileId) {
      prefetchedProfileId.current = null;
      return;
    }
    fetchList(activeProfileId, 1, debouncedFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, debouncedFilters]);

  function handleFiltersChange(f: ListFilters) {
    setFilters(f);
  }

  async function handleDelete(id: string) {
    setListItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirmId(null);
    await fetch(`/api/list/${id}`, { method: 'DELETE' });
    fetchProfiles();
  }

  function handleSearchSelect(item: any) {
    setSelectedItemMeta({});
    setModalForceEdit(true);
    setSelectedItem(item);

    if (!item.id && (item.tmdbId || item.malId)) {
      fetch('/api/content/ensure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          malId: item.malId,
          contentType: item.contentType,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.amdbId) {
            setSelectedItem((prev) => (prev ? { ...prev, id: data.amdbId } : prev));
          }
        })
        .catch(() => {});
    }
  }

  const NAV_TABS: { value: DashTab; label: string; shortLabel: string; Icon: React.ElementType }[] = [
    { value: 'watched',         label: 'Watched',         shortLabel: 'Watched', Icon: List },
    { value: 'planned',         label: 'Planned',         shortLabel: 'Planned', Icon: Bookmark },
    { value: 'recommendations', label: 'Recommendations', shortLabel: 'Recs',    Icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
                <Image
                  src="/logo.webp"
                  alt="AMDB"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover rounded-[6px]"
                />
              </div>
              <h1 className="text-xl font-black tracking-tighter text-white">AMDB</h1>
            </div>

            {/* Tab selector — desktop only, centered */}
            <div className="hidden md:flex flex-1 justify-center">
              <div className="flex items-center bg-white/5 rounded-full p-1 gap-0.5">
                {NAV_TABS.map(({ value, label, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setActiveTab(value)}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                      ${activeTab === value
                        ? 'bg-white text-black shadow'
                        : 'text-white/50 hover:text-white'}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <ProfileDropdown
                initialProfiles={profiles}
                onProfileSwitch={(p) => setActiveProfileId(p.id)}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 md:pt-6 pb-24 md:pb-8">
        <div className="flex flex-col">
          {/* Search bar */}
          <div className="mb-3">
            <SearchBar onSelect={handleSearchSelect} />
          </div>

          {/* ── Watched Tab ── */}
          {activeTab === 'watched' && (
            <>
              <div className="mb-3">
                <ListFilterBar filters={filters} onChange={handleFiltersChange} total={total} />
              </div>

              {listLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-xl bg-muted animate-pulse overflow-hidden">
                      <div className="aspect-[2/3] w-full" />
                      <div className="p-3 space-y-2">
                        <div className="h-3 bg-muted-foreground/20 rounded w-3/4" />
                        <div className="h-2.5 bg-muted-foreground/10 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listItems.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="flex flex-col items-center justify-center py-20 text-center select-none"
                >
                  <div className="relative mb-6">
                    <EmptyStateIllustration className="w-36 h-36 md:w-28 md:h-28" />
                  </div>
                  {(() => {
                    const hasActiveFilters =
                      filters.contentType !== 'ALL' ||
                      filters.watchStatus.length > 0 ||
                      filters.genres.length > 0 ||
                      filters.minRating > 1 ||
                      filters.maxRating < 10;
                    return hasActiveFilters ? (
                      <>
                        <h3 className="text-lg font-bold text-white mb-1">No matches found</h3>
                        <p className="text-sm text-white/40 max-w-xs">
                          Please try removing some filters to see more results.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-white mb-1">Your list is empty</h3>
                        <p className="text-sm text-white/40 max-w-xs">
                          Search for a movie, show, or anime above and add more to start building your
                          collection.
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-purple-400/70 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-2">
                          <span>↑</span>
                          <span>Use the search bar to add your first title</span>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              ) : (
                <>
                  <motion.div
                    layout
                    layoutRoot
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
                  >
                    {listItems.map((item) => (
                      <MovieCard
                        key={item.id}
                        id={item.content.id}
                        title={item.content.title}
                        year={item.content.year}
                        posterUrl={item.content.posterUrl}
                        backdropUrl={item.content.backdropUrl}
                        tagline={item.content.tagline}
                        genres={item.content.genres}
                        userRating={item.userRating}
                        tmdbRating={item.content.tmdbRating ? Number(item.content.tmdbRating) : null}
                        contentType={item.content.contentType as 'MOVIE' | 'TV_SHOW' | 'ANIME'}
                        adult={item.content.adult}
                        revenue={item.content.revenue}
                        languages={item.content.languages}
                        seasons={item.content.seasons}
                        episodes={item.content.episodes}
                        networks={item.content.networks}
                        episodeRuntime={item.content.episodeRuntime}
                        runtimeMins={item.content.runtimeMins}
                        omdbRatings={item.content.omdbRatings}
                        imdbRating={item.content.imdbRating}
                        ageCertification={item.content.ageCertification}
                        watchStatus={item.watchStatus}
                        notes={item.notes}
                        onEdit={() => {
                          setSelectedItemMeta({
                            rating: item.userRating,
                            notes: item.notes,
                            watchStatus: item.watchStatus,
                          });
                          setModalForceEdit(true);
                          setSelectedItem({
                            id: item.content.id,
                            tmdbId: (item.content as any).tmdbId,
                            malId: (item.content as any).malId,
                            title: item.content.title,
                            year: item.content.year,
                            posterUrl: item.content.posterUrl,
                            tmdbRating: item.content.tmdbRating,
                            overview: null,
                            contentType: item.content.contentType as any,
                          });
                        }}
                        onViewDetails={() => {
                          setSelectedItemMeta({
                            rating: item.userRating,
                            notes: item.notes,
                            watchStatus: item.watchStatus,
                          });
                          setModalForceEdit(false);
                          setSelectedItem({
                            id: item.content.id,
                            tmdbId: (item.content as any).tmdbId,
                            malId: (item.content as any).malId,
                            title: item.content.title,
                            year: item.content.year,
                            posterUrl: item.content.posterUrl,
                            tmdbRating: item.content.tmdbRating,
                            overview: null,
                            contentType: item.content.contentType as any,
                          });
                        }}
                        onDelete={() => setDeleteConfirmId(item.id)}
                        tmdbId={(item.content as any).tmdbId as number | undefined}
                        malId={(item.content as any).malId as number | undefined}
                      />
                    ))}
                  </motion.div>

                  {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => fetchList(activeProfileId, page - 1, debouncedFilters)}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center text-sm text-muted-foreground px-2">
                        {page} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === totalPages}
                        onClick={() => fetchList(activeProfileId, page + 1, debouncedFilters)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Planned Tab ── */}
          {activeTab === 'planned' && (
            <PlannedTab profileId={activeProfileId} onSelect={handleSearchSelect} />
          )}

          {/* ── Recommendations Tab ── */}
          {activeTab === 'recommendations' && (
            <RecommendationsTab 
              profileId={activeProfileId} 
              onSelect={handleSearchSelect} 
              refreshTrigger={recommendationsRefreshTrigger}
            />
          )}
        </div>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 pb-6 bg-gradient-to-t from-black via-black to-transparent pointer-events-none">
        <div className="max-w-[320px] mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-2xl shadow-black/50 pointer-events-auto">
          <div className="grid grid-cols-3 w-full gap-0.5">
            {NAV_TABS.map(({ value, shortLabel, Icon }) => (
              <button
                key={value}
                onClick={() => setActiveTab(value)}
                className={`rounded-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold transition-all
                  ${activeTab === value ? 'bg-white text-black' : 'text-white/50'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AddToListModal
        key={selectedItem ? (selectedItem.tmdbId ?? selectedItem.malId ?? 'new') : 'empty'}
        item={selectedItem}
        profileId={activeProfileId}
        initialRating={selectedItemMeta.rating}
        initialNotes={selectedItemMeta.notes}
        initialWatchStatus={selectedItemMeta.watchStatus}
        startInEditMode={modalForceEdit}
        onClose={() => {
          setSelectedItem(null);
          setSelectedItemMeta({});
        }}
        onSuccess={() => {
          fetchList(activeProfileId, 1, filters);
          setRecommendationsRefreshTrigger((t) => t + 1);
        }}
      />

      {/* Delete confirmation */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirmId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="font-bold text-lg mb-1">Remove from list?</p>
              <p className="text-sm text-muted-foreground mb-5">
                This will permanently remove this title and your rating from your list. This cannot
                be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(deleteConfirmId)}
                >
                  Remove permanently
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
