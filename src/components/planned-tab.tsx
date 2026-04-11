'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, LayoutGrid, LayoutList } from 'lucide-react';
import { Button } from './ui/button';
import { MovieCard } from './movie-card';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';
import { ListFilterBar, DEFAULT_FILTERS, type ListFilters } from './list-filter-bar';
import { AddTitleFAB } from './add-title-fab';
import { cn } from '@/lib/utils';

// 'grid'  → vertical poster cards (compact, no overview)
// 'list'  → horizontal cards with overview on the right
type ViewPref = 'grid' | 'list';
const VIEW_PREF_KEY = 'planned-view-pref';

interface WatchlistEntry {
  id: string;
  contentType: string;
  createdAt: string;
  recommendationLabel: string | null;
  recommendationReason: string | null;
  referredBy: {
    id: string;
    name: string | null;
    username: string | null;
    avatarColor: string;
    avatarEmoji: string | null;
  } | null;
  content: {
    id: string;
    title: string;
    year: number | null;
    posterUrl: string | null;
    tmdbRating: string | null;
    tmdbId: number | null;
    malId: number | null;
    contentType: string;
    ageCertification: string | null;
    runtimeMins: number | null;
    episodeRuntime: number | null;
    overview: string | null;
    shortDescription: string | null;
  };
}

interface ConfirmState {
  entryId: string;
  title: string;
}

interface PlannedTabProps {
  onSelect: (item: SearchResult) => void;
  initialPage?: number;
  onPageChange?: (p: number) => void;
}

function ConfirmRemoveModal({
  title,
  onConfirm,
  onCancel,
}: {
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-bold text-base mb-1">Remove from Planned?</p>
        <p className="text-sm text-muted-foreground mb-5 line-clamp-2">
          &ldquo;{title}&rdquo; will be removed from your planned list.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500/15 text-red-400 border border-red-500/20 text-sm font-semibold hover:bg-red-500/25 transition-colors"
          >
            Remove
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function PlannedTab({ onSelect, initialPage = 1, onPageChange }: PlannedTabProps) {
  const [items, setItems] = React.useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(initialPage);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());
  const [filters, setFilters] = React.useState<ListFilters>(DEFAULT_FILTERS);
  const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(null);

  // 'grid' = vertical poster cards, 'list' = horizontal cards with overview
  const [viewPref, setViewPref] = React.useState<ViewPref>('list');
  React.useEffect(() => {
    const saved = localStorage.getItem(VIEW_PREF_KEY) as ViewPref | null;
    if (saved === 'grid' || saved === 'list') setViewPref(saved);
  }, []);
  function setView(v: ViewPref) {
    setViewPref(v);
    localStorage.setItem(VIEW_PREF_KEY, v);
  }

  async function fetchWatchlist(p: number, f: ListFilters, force = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(p),
        sortBy: f.sortBy,
        sortOrder: f.sortOrder,
        minRating: String(f.minRating),
        maxRating: String(f.maxRating),
      });
      if (f.contentType !== 'ALL') params.set('contentType', f.contentType);
      if (f.genres.length > 0) params.set('genres', f.genres.join(','));
      if (f.watchStatus.length > 0) params.set('watchStatuses', f.watchStatus.join(','));

      const res = await fetch(`/api/watchlist?${params}`, { cache: force ? 'reload' : 'default' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(data.items ?? []);
      setPage(data.page);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchWatchlist(initialPage, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function goToPage(p: number) {
    setPage(p);
    onPageChange?.(p);
    fetchWatchlist(p, filters);
  }

  function handleRemoveClick(entry: WatchlistEntry) {
    setConfirmState({ entryId: entry.id, title: entry.content.title });
  }

  async function confirmRemove() {
    if (!confirmState) return;
    const { entryId } = confirmState;
    setConfirmState(null);
    setRemoving((prev) => new Set([...prev, entryId]));
    try {
      const res = await fetch(`/api/watchlist/${entryId}`, { method: 'DELETE' });
      if (res.ok) {
        setItems((prev) => prev.filter((e) => e.id !== entryId));
        setTotal((prev) => prev - 1);
      }
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    }
  }

  const isFiltered =
    filters.contentType !== 'ALL' ||
    filters.genres.length > 0 ||
    filters.minRating > 1 ||
    filters.maxRating < 10 ||
    filters.watchStatus.length > 0;

  const GridSkeleton = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border animate-pulse overflow-hidden flex flex-col">
          <div className="aspect-[2/3] w-full bg-muted" />
          <div className="p-2 space-y-1.5 flex-1">
            <div className="h-3 bg-muted rounded w-3/4" />
            <div className="h-2.5 bg-muted/60 rounded w-1/2" />
          </div>
          {/* Rate bar */}
          <div className="h-[34px] border-t border-border bg-muted/30" />
        </div>
      ))}
    </div>
  );

  const ListSkeleton = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="md:col-span-2">
          <div className="flex w-full animate-pulse overflow-hidden rounded-xl border border-border bg-card h-[180px] md:h-[225px]">
            <div className="w-[120px] sm:w-[150px] aspect-[2/3] bg-muted shrink-0" />
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 p-3 md:p-4 space-y-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-5/6 rounded bg-muted" />
                  <div className="h-3 w-4/6 rounded bg-muted" />
                </div>
              </div>
              {/* Planned + Rate action bar */}
              <div className="flex items-stretch border-t border-border shrink-0 h-[36px]">
                <div className="flex-1 border-r border-border bg-emerald-500/5" />
                <div className="flex-1 bg-muted/10" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AddTitleFAB onSelect={onSelect} />

      {/* Filter bar + view toggle */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <ListFilterBar filters={filters} onChange={setFilters} total={total} hideUserRating />
        </div>
        <div className="flex items-center gap-0.5 p-0.5 h-8 bg-muted rounded-lg shrink-0">
          <button
            onClick={() => setView('grid')}
            title="Poster grid"
            className={cn(
              'p-1 rounded-md transition-colors',
              viewPref === 'grid'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('list')}
            title="Cards with overview"
            className={cn(
              'p-1 rounded-md transition-colors',
              viewPref === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && page === 1 ? (
        viewPref === 'grid' ? GridSkeleton : ListSkeleton
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center select-none text-muted-foreground">
          <Bookmark className="w-14 h-14 mb-4 opacity-20" />
          <p className="text-lg font-bold text-white mb-1">
            {isFiltered ? 'No matches found' : 'Nothing planned yet'}
          </p>
          <p className="text-sm opacity-60 max-w-xs">
            {isFiltered
              ? 'Try removing some filters to see more results.'
              : 'Bookmark titles from Recommendations or add items using "Plan to Watch" when searching.'}
          </p>
        </div>
      ) : viewPref === 'grid' ? (
        /* ── Vertical poster grid ── */
        <>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((entry) => {
                const item = entry.content;
                return (
                  <div key={entry.id}>
                    <MovieCard
                      id={item.id}
                      title={item.title}
                      year={item.year}
                      posterUrl={item.posterUrl}
                      contentType={item.contentType as ContentType}
                      tmdbRating={item.tmdbRating != null ? Number(item.tmdbRating) : null}
                      ageCertification={item.ageCertification}
                      runtimeMins={item.runtimeMins}
                      episodeRuntime={item.episodeRuntime}
                      variant="PLANNED"
                      layout="vertical"
                      onDelete={() => handleRemoveClick(entry)}
                      onSecondaryAction={() =>
                        onSelect({
                          id: item.id,
                          tmdbId: item.tmdbId ?? undefined,
                          malId: item.malId ?? undefined,
                          title: item.title,
                          year: item.year,
                          posterUrl: item.posterUrl,
                          tmdbRating: item.tmdbRating != null ? Number(item.tmdbRating) : null,
                          overview: item.overview,
                          contentType: item.contentType as ContentType,
                        })
                      }
                      recommendationLabel={entry.recommendationLabel}
                      recommendationReason={entry.recommendationReason}
                      referrer={entry.referredBy}
                    />
                  </div>
                );
              })}
            </div>
          </AnimatePresence>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => goToPage(page - 1)}>Prev</Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      ) : (
        /* ── Horizontal cards with overview ── */
        <>
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
              {items.map((entry) => {
                const item = entry.content;
                return (
                  <div key={entry.id} className="md:col-span-2">
                    <MovieCard
                      id={item.id}
                      title={item.title}
                      year={item.year}
                      posterUrl={item.posterUrl}
                      contentType={item.contentType as ContentType}
                      tmdbRating={item.tmdbRating != null ? Number(item.tmdbRating) : null}
                      ageCertification={item.ageCertification}
                      runtimeMins={item.runtimeMins}
                      episodeRuntime={item.episodeRuntime}
                      overview={entry.recommendationLabel ? undefined : (item.shortDescription ?? item.overview)}
                      recommendationReason={entry.recommendationReason}
                      recommendationLabel={entry.recommendationLabel}
                      referrer={entry.referredBy}
                      variant="PLANNED"
                      layout="horizontal"
                      onDelete={() => handleRemoveClick(entry)}
                      onSecondaryAction={() =>
                        onSelect({
                          id: item.id,
                          tmdbId: item.tmdbId ?? undefined,
                          malId: item.malId ?? undefined,
                          title: item.title,
                          year: item.year,
                          posterUrl: item.posterUrl,
                          tmdbRating: item.tmdbRating != null ? Number(item.tmdbRating) : null,
                          overview: item.overview,
                          contentType: item.contentType as ContentType,
                        })
                      }
                    />
                  </div>
                );
              })}
            </div>
          </AnimatePresence>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => goToPage(page - 1)}>Prev</Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmState && (
          <ConfirmRemoveModal
            title={confirmState.title}
            onConfirm={confirmRemove}
            onCancel={() => setConfirmState(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
