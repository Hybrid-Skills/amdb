'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, X, Trash2, Film, Tv, PlayCircle, Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { StreamingButton } from './ui/streaming-button';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';
import Image from 'next/image';
import { tmdbImageLoader } from '@/lib/tmdb';

const CONTENT_ICONS: Record<string, React.ReactNode> = {
  MOVIE: <Film className="w-3 h-3 text-cyan-400" />,
  TV_SHOW: <Tv className="w-3 h-3 text-blue-400" />,
  ANIME: (
    <span
      className="text-[11px] font-black text-purple-400 leading-none select-none"
      style={{ fontFamily: 'serif' }}
    >
      ア
    </span>
  ),
};

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
          {items.map((entry, i) => {
            const item = entry.content;
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 26 }}
                className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/50 shadow-sm hover:shadow-xl transition-all"
                onClick={() =>
                  onSelect({
                    id:          item.id,
                    tmdbId:      item.tmdbId ?? undefined,
                    malId:       item.malId ?? undefined,
                    title:       item.title,
                    year:        item.year,
                    posterUrl:   item.posterUrl,
                    tmdbRating:  item.tmdbRating != null ? Number(item.tmdbRating) : null,
                    overview:    null,
                    contentType: item.contentType as ContentType,
                  })
                }
              >
                {/* Poster */}
                <div className="relative aspect-[2/3] overflow-hidden">
                  {item.posterUrl ? (
                    <Image
                      loader={tmdbImageLoader}
                      src={item.posterUrl}
                      alt={item.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 200px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm px-3 text-center">
                      {item.title}
                    </div>
                  )}

                  {/* TMDB rating — bottom right */}
                  {item.tmdbRating != null && Number(item.tmdbRating) > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
                      ★ {Number(item.tmdbRating).toFixed(1)}
                    </div>
                  )}

                  {/* Top-Left: Delete Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(entry.id);
                    }}
                    disabled={removing.has(entry.id)}
                    className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center bg-black/40 backdrop-blur-md border border-white/10 rounded-lg hover:bg-destructive/20 transition-all z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    title="Remove from planned"
                  >
                    {removing.has(entry.id) ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-white/60" />
                    )}
                  </button>

                  {/* Bottom-Left: Content Type Icon */}
                  <div className="absolute bottom-2 left-2 z-10 flex gap-1 items-center">
                    <Badge
                      variant="secondary"
                      className="h-5 w-5 p-0 flex items-center justify-center bg-black/60 text-white/90 font-bold rounded-md border border-white/20 shadow-lg"
                      title={item.contentType.replace('_', ' ')}
                    >
                      {CONTENT_ICONS[item.contentType] || <PlayCircle className="w-3 h-3" />}
                    </Badge>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="min-h-[2.5rem]">
                    <p className="font-bold text-sm leading-tight line-clamp-2">{item.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.year}</p>
                  </div>

                  <div 
                    className="mt-auto pt-2 border-t border-border flex items-center justify-between hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect({
                        id:          item.id,
                        tmdbId:      item.tmdbId ?? undefined,
                        malId:       item.malId ?? undefined,
                        title:       item.title,
                        year:        item.year,
                        posterUrl:   item.posterUrl,
                        tmdbRating:  item.tmdbRating != null ? Number(item.tmdbRating) : null,
                        overview:    null,
                        contentType: item.contentType as ContentType,
                      });
                    }}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 opacity-80">
                      Watched? <span className="text-primary">Rate</span>
                    </span>
                    <Star className="w-3 h-3 text-primary" />
                  </div>
                </div>
              </motion.div>
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
