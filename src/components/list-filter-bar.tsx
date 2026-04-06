'use client';

import * as React from 'react';
import { SlidersHorizontal, ArrowUpDown, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import type { ContentType } from '@prisma/client';

export type SortBy = 'addedAt' | 'userRating' | 'tmdbRating' | 'title' | 'year';

export interface ListFilters {
  contentType: ContentType | 'ALL';
  sortBy: SortBy;
  sortOrder: 'asc' | 'desc';
  minRating: number;
  maxRating: number;
  watchStatus: string[];
  genres: string[];
}

export const DEFAULT_FILTERS: ListFilters = {
  contentType: 'ALL',
  sortBy: 'addedAt',
  sortOrder: 'desc',
  minRating: 1,
  maxRating: 10,
  watchStatus: [],
  genres: [],
};

const CONTENT_TYPE_PILLS: { value: ContentType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'MOVIE', label: 'Movies' },
  { value: 'TV_SHOW', label: 'TV Shows' },
];

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'addedAt', label: 'Date Added' },
  { value: 'userRating', label: 'My Rating' },
  { value: 'tmdbRating', label: 'TMDB Rating' },
  { value: 'title', label: 'Title' },
  { value: 'year', label: 'Year' },
];

const WATCH_STATUSES = [
  { value: 'WATCHING', label: 'Watching' },
  { value: 'PLAN_TO_WATCH', label: 'Plan to Watch' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DROPPED', label: 'Dropped' },
];

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Western',
];

interface ListFilterBarProps {
  filters: ListFilters;
  onChange: (filters: ListFilters) => void;
  total: number;
}

export function ListFilterBar({ filters, onChange, total }: ListFilterBarProps) {
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const sortRef = React.useRef<HTMLDivElement>(null);

  // Count active non-default filters (excluding contentType and sort which are always visible)
  const activeFilterCount = [
    filters.minRating > 1 || filters.maxRating < 10,
    filters.watchStatus.length > 0,
    filters.genres.length > 0,
  ].filter(Boolean).length;

  function set<K extends keyof ListFilters>(key: K, value: ListFilters[K]) {
    onChange({ ...filters, [key]: value });
  }

  function toggleWatchStatus(status: string) {
    set(
      'watchStatus',
      filters.watchStatus.includes(status)
        ? filters.watchStatus.filter((s) => s !== status)
        : [...filters.watchStatus, status],
    );
  }

  function toggleGenre(genre: string) {
    set(
      'genres',
      filters.genres.includes(genre)
        ? filters.genres.filter((g) => g !== genre)
        : [...filters.genres, genre],
    );
  }

  function clearAllFilters() {
    onChange({
      ...filters,
      minRating: 1,
      maxRating: 10,
      watchStatus: [],
      genres: [],
    });
  }

  // Close popovers on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const currentSort = SORT_OPTIONS.find((o) => o.value === filters.sortBy)!;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Content type pills */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {CONTENT_TYPE_PILLS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set('contentType', value)}
              className={cn(
                'px-3 py-1 rounded-md text-sm font-medium transition-all',
                filters.contentType === value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Sort dropdown */}
          <div className="relative" ref={sortRef}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-sm h-8"
              onClick={() => { setSortOpen((o) => !o); setFilterOpen(false); }}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {currentSort.label}
              <ChevronDown className="w-3 h-3 opacity-50" />
            </Button>
            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-xl overflow-hidden min-w-[170px]"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        if (filters.sortBy === opt.value) {
                          set('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          // Sensible default order per field
                          const defaultDesc = ['addedAt', 'userRating', 'tmdbRating', 'year'];
                          onChange({
                            ...filters,
                            sortBy: opt.value,
                            sortOrder: defaultDesc.includes(opt.value) ? 'desc' : 'asc',
                          });
                        }
                        setSortOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors',
                        filters.sortBy === opt.value && 'text-primary font-medium',
                      )}
                    >
                      {opt.label}
                      {filters.sortBy === opt.value && (
                        <span className="text-xs text-muted-foreground">
                          {filters.sortOrder === 'desc' ? '↓' : '↑'}
                        </span>
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Filter popover */}
          <div className="relative" ref={popoverRef}>
            <Button
              variant="outline"
              size="sm"
              className={cn('gap-1.5 text-sm h-8', activeFilterCount > 0 && 'border-primary text-primary')}
              onClick={() => { setFilterOpen((o) => !o); setSortOpen(false); }}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-xl shadow-xl w-72 p-4 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Filters</p>
                    {activeFilterCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                      >
                        <X className="w-3 h-3" /> Clear all
                      </button>
                    )}
                  </div>

                  {/* My Rating range */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      My Rating
                    </p>
                    <div className="flex items-center gap-2">
                      <select
                        value={filters.minRating}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onChange({ ...filters, minRating: val, maxRating: Math.max(val, filters.maxRating) });
                        }}
                        className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <span className="text-muted-foreground text-sm">to</span>
                      <select
                        value={filters.maxRating}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onChange({ ...filters, maxRating: val, minRating: Math.min(val, filters.minRating) });
                        }}
                        className="flex-1 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Watch Status */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Watch Status
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {WATCH_STATUSES.map(({ value, label }) => (
                        <Badge
                          key={value}
                          variant={filters.watchStatus.includes(value) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                          onClick={() => toggleWatchStatus(value)}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Genres */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Genre
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {GENRES.map((g) => (
                        <Badge
                          key={g}
                          variant={filters.genres.includes(g) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                          onClick={() => toggleGenre(g)}
                        >
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Active filter chips + result count */}
      {(activeFilterCount > 0 || filters.contentType !== 'ALL') && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{total} result{total !== 1 ? 's' : ''}</span>
          {(filters.minRating > 1 || filters.maxRating < 10) && (
            <Chip label={`Rating ${filters.minRating}–${filters.maxRating}`} onRemove={() => onChange({ ...filters, minRating: 1, maxRating: 10 })} />
          )}
          {filters.watchStatus.map((s) => (
            <Chip
              key={s}
              label={WATCH_STATUSES.find((w) => w.value === s)?.label ?? s}
              onRemove={() => toggleWatchStatus(s)}
            />
          ))}
          {filters.genres.map((g) => (
            <Chip key={g} label={g} onRemove={() => toggleGenre(g)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 text-xs">
      {label}
      <button onClick={onRemove} className="hover:text-foreground transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}
