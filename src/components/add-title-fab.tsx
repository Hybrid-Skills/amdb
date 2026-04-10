'use client';

import * as React from 'react';
import { Plus, Search, X, Loader2 } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import type { SearchResult } from './add-to-list-modal';

interface AddTitleFABProps {
  onSelect: (result: SearchResult) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showButton?: boolean;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function SearchSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (r: SearchResult) => void;
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) { setQuery(''); setResults([]); return; }
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&page=1`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { setResults(data?.results ?? []); setLoading(false); })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [debouncedQuery]);

  const inner = (
    <div className="flex flex-col">
      <div className="px-4 pt-2 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movies, shows, anime..."
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-9 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="overflow-y-auto max-h-[60vh] px-4 pb-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        )}
        {!loading && results.map((r) => (
          <button
            key={r.tmdbId ?? r.malId}
            onClick={() => { onSelect(r); onClose(); }}
            className="w-full flex items-center gap-3 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 rounded-xl px-2 transition-colors text-left"
          >
            <div className="w-10 h-14 rounded-lg overflow-hidden bg-white/5 shrink-0">
              {r.posterUrl ? (
                <Image
                  src={r.posterUrl}
                  alt={r.title}
                  width={40}
                  height={56}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{r.title}</p>
              <p className="text-xs text-white/40">{r.year ?? '—'}</p>
            </div>
            <Badge variant="outline" className="text-[10px] shrink-0 border-white/10 text-white/40">
              {r.contentType === 'MOVIE' ? 'Movie' : r.contentType === 'ANIME' ? 'Anime' : 'TV'}
            </Badge>
          </button>
        ))}
        {!loading && debouncedQuery.length >= 2 && results.length === 0 && (
          <p className="text-center text-white/30 text-sm py-8">No results found</p>
        )}
        {!loading && debouncedQuery.length < 2 && (
          <p className="text-center text-white/20 text-sm py-8">Type at least 2 characters to search</p>
        )}
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md bg-zinc-950 border-white/10 text-white p-0 overflow-hidden">
          <DialogTitle className="sr-only">Add a title</DialogTitle>
          {inner}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-zinc-950 border-white/10 text-white pb-8">
        <DrawerTitle className="sr-only">Add a title</DrawerTitle>
        {inner}
      </DrawerContent>
    </Drawer>
  );
}

export function AddTitleFAB({ onSelect, open: controlledOpen, onOpenChange, showButton = true }: AddTitleFABProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => {
    if (latest > 50 && !collapsed) setCollapsed(true);
    else if (latest <= 50 && collapsed) setCollapsed(false);
  });

  return (
    <>
      <div className={`fixed bottom-24 md:bottom-10 right-6 z-40 ${showButton ? '' : 'hidden'}`}>
        <motion.button
          onClick={() => setOpen(true)}
          animate={{
            width: collapsed ? 56 : 148,
            paddingLeft: collapsed ? 0 : 16,
            paddingRight: collapsed ? 0 : 16,
          }}
          transition={{ type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
          className="flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold h-14 rounded-full shadow-2xl shadow-cyan-500/30 hover:scale-105 active:scale-95 overflow-hidden"
        >
          <div className="flex items-center justify-center w-full">
            <Plus className="w-5 h-5 shrink-0" />
            <motion.span
              animate={{
                width: collapsed ? 0 : 'auto',
                opacity: collapsed ? 0 : 1,
                marginLeft: collapsed ? 0 : 8,
              }}
              transition={{ type: 'tween', ease: [0.4, 0, 0.2, 1], duration: 0.3 }}
              className="whitespace-nowrap overflow-hidden"
            >
              Add Title
            </motion.span>
          </div>
        </motion.button>
      </div>

      <SearchSheet open={open} onClose={() => setOpen(false)} onSelect={onSelect} />
    </>
  );
}
