'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';

interface SearchBarProps {
  onSelect: (result: SearchResult) => void;
  activeType?: ContentType | 'all';
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchBar({ onSelect, activeType = 'all' }: SearchBarProps) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [panelPos, setPanelPos] = React.useState({ top: 0, left: 0, width: 0 });
  const [mounted, setMounted] = React.useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}&type=${activeType}&page=${page}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results ?? []);
        setTotalPages(data.totalPages ?? 1);
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setPanelPos({
            top: rect.bottom + window.scrollY + 8,
            left: rect.left,
            width: rect.width,
          });
        }
        setOpen(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debouncedQuery, page, activeType]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeType]);

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideContainer && !insidePanel) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSelect(result: SearchResult) {
    onSelect(result);
    setQuery('');
    setOpen(false);
    setResults([]);
  }

  const panel =
    mounted &&
    createPortal(
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            ref={panelRef}
            key="search-results"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
              zIndex: 9999,
            }}
            className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden max-h-[480px] flex flex-col"
          >
            <div className="overflow-y-auto flex-1">
              {results.map((result, i) => (
                <motion.button
                  key={`${result.tmdbId ?? result.malId}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors text-left"
                >
                  <div className="shrink-0 w-10 h-14 rounded overflow-hidden bg-muted relative">
                    {result.posterUrl ? (
                      <Image
                        src={result.posterUrl}
                        alt={result.title}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        ?
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{result.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {result.year && (
                        <span className="text-xs text-muted-foreground">{result.year}</span>
                      )}
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {result.contentType === 'TV_SHOW'
                          ? 'TV'
                          : result.contentType === 'ANIME'
                            ? 'Anime'
                            : 'Movie'}
                      </Badge>
                      {result.tmdbRating != null && result.tmdbRating > 0 && (
                        <span className="text-xs text-yellow-400">
                          ★ {result.tmdbRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs text-muted-foreground bg-card">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="hover:text-foreground disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="hover:text-foreground disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {!loading && query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search movies, TV shows, anime..."
          className="pl-9 pr-9 h-11 text-base bg-card"
          onFocus={() => {
            if (results.length > 0) {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setPanelPos({
                  top: rect.bottom + window.scrollY + 8,
                  left: rect.left,
                  width: rect.width,
                });
              }
              setOpen(true);
            }
          }}
        />
      </div>
      {panel}
    </div>
  );
}
