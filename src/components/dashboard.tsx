'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { ProfileDropdown } from './profile-dropdown';
import { type Profile } from './profile-selector';
import { RefreshCw } from 'lucide-react';
import { SearchBar } from './search-bar';
import { AddToListModal, type SearchResult } from './add-to-list-modal';
import { MovieCard } from './movie-card';
import { RecommendationsTab } from './recommendations-tab';
import { ListFilterBar, DEFAULT_FILTERS, type ListFilters } from './list-filter-bar';
import { AnimatePresence, motion } from 'framer-motion';
import { List, Sparkles } from 'lucide-react';
import { EmptyStateIllustration } from './ui/empty-state-illustration';

interface DashboardProps {
  initialProfiles: Profile[];
  userName: string;
}

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

export function Dashboard({ initialProfiles }: DashboardProps) {
  const [profiles, setProfiles] = React.useState<Profile[]>(initialProfiles);
  const [activeProfileId, setActiveProfileId] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('amdb_last_profile_id');
      if (saved && initialProfiles.some(p => p.id === saved)) return saved;
    }
    return initialProfiles.find((p) => p.isDefault)?.id ?? initialProfiles[0]?.id ?? '';
  });
  const [selectedItem, setSelectedItem] = React.useState<SearchResult | null>(null);
  const [selectedItemMeta, setSelectedItemMeta] = React.useState<{
    rating?: number;
    notes?: string | null;
    watchStatus?: string | null;
  }>({});
  const [modalForceEdit, setModalForceEdit] = React.useState(false);
  const [listItems, setListItems] = React.useState<ListItem[]>([]);
  const [listLoading, setListLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [filters, setFilters] = React.useState<ListFilters>(DEFAULT_FILTERS);

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



  // Fetch when profile or filters change — reset to page 1
  React.useEffect(() => {
    if (activeProfileId) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('amdb_last_profile_id', activeProfileId);
      }
      fetchList(activeProfileId, 1, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfileId, filters]);

  function handleFiltersChange(f: ListFilters) {
    setFilters(f);
  }

  async function handleDelete(id: string) {
    setListItems((prev) => prev.filter((i) => i.id !== id));
    setDeleteConfirmId(null);
    await fetch(`/api/list/${id}`, { method: 'DELETE' });
    fetchProfiles();
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchList(activeProfileId, page, filters);
    setRefreshing(false);
  }

  async function handleSearchSelect(item: any) {
    let amdbId = item.id;
    
    // If no ID, ensure it exists in our DB first (discovery flow)
    if (!amdbId) {
      try {
        const res = await fetch('/api/content/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId: item.tmdbId,
            malId: item.malId,
            contentType: item.contentType,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          amdbId = data.amdbId;
        }
      } catch (e) {
        console.error('Failed to ensure content on select:', e);
      }
    }

    setSelectedItemMeta({});
    setModalForceEdit(true); 
    setSelectedItem({
      ...item,
      id: amdbId,
    });
  }

  return (
    <Tabs defaultValue="list" className="min-h-screen bg-background pb-16 md:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20">
                <img src="/logo.png" alt="AMDB" className="w-full h-full object-cover rounded-[6px]" />
              </div>
              <h1 className="text-xl font-black tracking-tighter text-white">AMDB</h1>
            </div>

            {/* Tab Selector — centered in header on desktop only */}
            <div className="hidden md:flex flex-1 justify-center">
              <TabsList>
                <TabsTrigger value="list">My List</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              </TabsList>
            </div>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <ProfileDropdown 
                onProfileSwitch={(p) => setActiveProfileId(p.id)}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 md:pt-6 pb-24 md:pb-8">
        <div className="flex flex-col">
          {/* Redundant Profile Switcher Removed */}

          {/* Search bar — full width, centered */}
            <div className="mb-3">
              <SearchBar onSelect={handleSearchSelect} />
            </div>

            <TabsContent value="list">
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
                          Try adjusting or clearing your filters to see more results.
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-lg font-bold text-white mb-1">Your list is empty</h3>
                        <p className="text-sm text-white/40 max-w-xs">
                          Search for a movie, show, or anime above and add it to start building your collection.
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
                  <motion.div layout layoutRoot className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                          tmdbRating={
                            item.content.tmdbRating ? Number(item.content.tmdbRating) : null
                          }
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
                        onClick={() => fetchList(activeProfileId, page - 1, filters)}
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
                        onClick={() => fetchList(activeProfileId, page + 1, filters)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="recommendations">
              <RecommendationsTab
                profileId={activeProfileId}
                onSelect={handleSearchSelect}
              />
            </TabsContent>

            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-3 pb-6 bg-gradient-to-t from-black via-black to-transparent pointer-events-none">
              <div className="max-w-[280px] mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-full p-1 shadow-2xl shadow-black/50 pointer-events-auto">
                <TabsList className="grid grid-cols-2 w-full bg-transparent h-10">
                  <TabsTrigger 
                    value="list" 
                    className="rounded-full data-[state=active]:bg-white data-[state=active]:text-black transition-all flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>List</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="recommendations" 
                    className="rounded-full data-[state=active]:bg-white data-[state=active]:text-black transition-all flex items-center justify-center gap-2 text-xs font-bold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Recs</span>
                  </TabsTrigger>
                </TabsList>
              </div>
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
        onSuccess={() => fetchList(activeProfileId, 1, filters)}
      />

      {/* ── Delete item confirmation ─────────────────── */}
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
                This will permanently remove this title and your rating from your list. This cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirmId)}>
                  Remove permanently
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Tabs>
  );
}
