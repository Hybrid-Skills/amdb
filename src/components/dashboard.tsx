'use client';

import * as React from 'react';
import { signOut } from 'next-auth/react';
import { LogOut, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { ProfileSelector, type Profile } from './profile-selector';
import { SearchBar } from './search-bar';
import { AddToListModal, type SearchResult } from './add-to-list-modal';
import { MovieCard } from './movie-card';
import { RecommendationsTab } from './recommendations-tab';
import { ListFilterBar, DEFAULT_FILTERS, type ListFilters } from './list-filter-bar';
import { AnimatePresence, motion } from 'framer-motion';

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
  };
}

export function Dashboard({ initialProfiles }: DashboardProps) {
  const [profiles, setProfiles] = React.useState<Profile[]>(initialProfiles);
  const [activeProfileId, setActiveProfileId] = React.useState<string>(
    initialProfiles.find((p) => p.isDefault)?.id ?? initialProfiles[0]?.id ?? '',
  );
  const [selectedItem, setSelectedItem] = React.useState<SearchResult | null>(null);
  const [selectedItemMeta, setSelectedItemMeta] = React.useState<{
    rating?: number;
    notes?: string | null;
    watchStatus?: string | null;
  }>({});
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
    if (activeProfileId) fetchList(activeProfileId, 1, filters);
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold tracking-tight shrink-0">AMDB</h1>
          <div className="flex-1 overflow-x-auto">
            <ProfileSelector
              profiles={profiles}
              activeProfileId={activeProfileId}
              onSelect={setActiveProfileId}
              onProfilesChange={fetchProfiles}
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing || listLoading}
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="list">
          <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <TabsList>
              <TabsTrigger value="list">My List</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list">
            {/* Search */}
            <div className="mb-5">
              <SearchBar onSelect={setSelectedItem} />
            </div>

            {/* Filter bar */}
            <div className="mb-6">
              <ListFilterBar filters={filters} onChange={handleFiltersChange} total={total} />
            </div>

            {/* Grid */}
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24 text-muted-foreground"
              >
                <p className="text-lg font-medium mb-1">Nothing here yet</p>
                <p className="text-sm">
                  {total === 0
                    ? 'Search above to add movies, shows, or anime to your list'
                    : 'No items match your current filters'}
                </p>
              </motion.div>
            ) : (
              <>
                <motion.div layout layoutRoot className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {listItems.map((item) => (
                      <MovieCard
                        key={item.id}
                        id={item.id}
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
                          setSelectedItem({
                            tmdbId:
                              (item.content as Record<string, unknown>).tmdbId as
                                | number
                                | undefined,
                            malId:
                              (item.content as Record<string, unknown>).malId as
                                | number
                                | undefined,
                            title: item.content.title,
                            year: item.content.year,
                            posterUrl: item.content.posterUrl,
                            tmdbRating: item.content.tmdbRating,
                            overview: null,
                            contentType: item.content.contentType as
                              | 'MOVIE'
                              | 'TV_SHOW'
                              | 'ANIME',
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
            <RecommendationsTab profileId={activeProfileId} onSelect={setSelectedItem} />
          </TabsContent>
        </Tabs>
      </main>

      <AddToListModal
        key={selectedItem ? (selectedItem.tmdbId ?? selectedItem.malId ?? 'new') : 'empty'}
        item={selectedItem}
        profileId={activeProfileId}
        initialRating={selectedItemMeta.rating}
        initialNotes={selectedItemMeta.notes}
        initialWatchStatus={selectedItemMeta.watchStatus}
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
    </div>
  );
}
