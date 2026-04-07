'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import { MovieCard } from './movie-card';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';

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
}

export function PlannedTab({ profileId, onSelect }: PlannedTabProps) {
  const [items, setItems] = React.useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());

  async function fetchWatchlist(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/watchlist?profileId=${profileId}&page=${p}`);
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
    fetchWatchlist(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId]);

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

  if (loading) {
    return (
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
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center select-none text-muted-foreground">
        <Bookmark className="w-14 h-14 mb-4 opacity-20" />
        <p className="text-lg font-bold text-white mb-1">Nothing planned yet</p>
        <p className="text-sm opacity-60 max-w-xs">
          Bookmark titles from Recommendations or use "Plan to Watch" when adding from search.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            onClick={() => fetchWatchlist(page - 1)}
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
            onClick={() => fetchWatchlist(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
