'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { MovieCard } from './movie-card';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';
import { ListFilterBar, DEFAULT_FILTERS, type ListFilters } from './list-filter-bar';
import { AddTitleFAB } from './add-title-fab';

interface WatchlistEntry {
  id: string;
  contentType: string;
  createdAt: string;
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
  };
}

interface PlannedTabProps {
  profileId: string;
  onSelect: (item: SearchResult) => void;
  initialPage?: number;
  onPageChange?: (p: number) => void;
}

export function PlannedTab({ profileId, onSelect, initialPage = 1, onPageChange }: PlannedTabProps) {
  const [items, setItems] = React.useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(initialPage);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());
  const [filters, setFilters] = React.useState<ListFilters>(DEFAULT_FILTERS);

  async function fetchWatchlist(p: number, f: ListFilters, force = false) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        profileId,
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
    if (profileId) {
      fetchWatchlist(initialPage, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, filters]);

  function goToPage(p: number) {
    setPage(p);
    onPageChange?.(p);
    fetchWatchlist(p, filters);
  }

  async function handleRemove(entryId: string) {
    if (!confirm('Remove this title from your planned list?')) return;
    
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

  if (loading && page === 1) {
    return (
      <div className="space-y-4">
        <AddTitleFAB onSelect={onSelect} />
        <ListFilterBar filters={filters} onChange={setFilters} total={total} hideUserRating />
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
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AddTitleFAB onSelect={onSelect} />
      <ListFilterBar filters={filters} onChange={setFilters} total={total} hideUserRating />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center select-none text-muted-foreground">
          <Bookmark className="w-14 h-14 mb-4 opacity-20" />
          <p className="text-lg font-bold text-white mb-1">
            {isFiltered ? 'No matches found' : 'Nothing planned yet'}
          </p>
          <p className="text-sm opacity-60 max-w-xs">
            {isFiltered 
              ? 'Please try removing some filters to see more results.'
              : 'Bookmark titles from Recommendations or add more items using "Plan to Watch" when adding from search.'}
          </p>
        </div>
      ) : (
        <>
          <AnimatePresence>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((entry) => {
                const item = entry.content;
                return (
                  <MovieCard
                    key={entry.id}
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
                    onDelete={() => handleRemove(entry.id)}
                    onSecondaryAction={() => onSelect({
                      id:          item.id,
                      tmdbId:      item.tmdbId ?? undefined,
                      malId:       item.malId ?? undefined,
                      title:       item.title,
                      year:        item.year,
                      posterUrl:   item.posterUrl,
                      tmdbRating:  item.tmdbRating != null ? Number(item.tmdbRating) : null,
                      overview:    null,
                      contentType: item.contentType as ContentType,
                    })}
                  />
                );
              })}
            </div>
          </AnimatePresence>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => goToPage(page - 1)}
              >
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
