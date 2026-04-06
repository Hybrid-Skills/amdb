'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Sparkles, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';

interface RecommendationsTabProps {
  profileId: string;
  onSelect: (item: SearchResult) => void;
}

const CONTENT_TYPES: { value: ContentType | 'ANY'; label: string }[] = [
  { value: 'ANY', label: 'Any' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'TV_SHOW', label: 'TV Show' },
  { value: 'ANIME', label: 'Anime' },
];

const MOVIE_TV_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-Fi',
  'Thriller', 'Western', 'Isekai', 'Mecha', 'Slice of Life',
  'Sports', 'Supernatural',
];

type RecResult = SearchResult & { reason?: string };

export function RecommendationsTab({ profileId, onSelect }: RecommendationsTabProps) {
  const [loading, setLoading] = React.useState(false);
  const [recs, setRecs] = React.useState<RecResult[]>([]);
  const [type, setType] = React.useState<ContentType | 'ANY' | 'ANIME'>('MOVIE');
  const [selectedGenres, setSelectedGenres] = React.useState<string[]>([]);
  const [error, setError] = React.useState('');

  const genres = MOVIE_TV_GENRES;

  // Clear selected genres when type changes to avoid stale genre filters
  React.useEffect(() => {
    setSelectedGenres([]);
  }, [type]);

  function toggleGenre(g: string) {
    setSelectedGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function generateRecs() {
    setLoading(true);
    setError('');
    setRecs([]);

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, contentType: type, genres: selectedGenres }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRecs(data.recommendations ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Filters Panel */}
        <div className="w-full md:w-64 shrink-0 space-y-6 bg-card p-5 rounded-2xl border border-border">
          <div className="flex items-center gap-2 font-semibold">
            <Filter className="w-4 h-4" />
            Filters
          </div>

          {/* Content type — single select */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Content Type</p>
            <div className="flex flex-col gap-2">
              {CONTENT_TYPES.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-foreground transition-colors"
                >
                  <input
                    type="radio"
                    name="contentType"
                    checked={type === value}
                    onChange={() => setType(value)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Genres — multi select, changes with content type */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Genres</p>
              {selectedGenres.length > 0 && (
                <button
                  onClick={() => setSelectedGenres([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <Badge
                  key={g}
                  variant={selectedGenres.includes(g) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>

          <Button
            className="w-full font-bold gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 text-white shadow-lg"
            onClick={generateRecs}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating...' : 'Generate'}
          </Button>
        </div>

        {/* Results */}
        <div className="flex-1 w-full min-h-[400px]">
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-center border border-destructive/20 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && recs.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-24 border-2 border-dashed border-border rounded-2xl">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium mb-1">Discover your next obsession</p>
              <p className="text-sm opacity-80 max-w-sm text-center">
                Set your filters and hit generate — recommendations are personalised to your ratings
                history.
              </p>
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] rounded-xl bg-card border border-border animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && recs.length > 0 && (
            <AnimatePresence>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4">
                {recs.map((item, i) => (
                  <motion.div
                    key={item.tmdbId ?? item.malId ?? i}
                    initial={{ opacity: 0, scale: 0.92, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 24 }}
                    className="group flex flex-col rounded-xl overflow-hidden bg-card border border-border cursor-pointer hover:border-primary/50 shadow-sm hover:shadow-xl transition-all"
                    onClick={() => onSelect(item)}
                  >
                    {/* Poster */}
                    <div className="relative aspect-[2/3] overflow-hidden">
                      {item.posterUrl ? (
                        <img
                          src={item.posterUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm px-3 text-center">
                          {item.title}
                        </div>
                      )}
                      {/* Rating badge */}
                      {item.tmdbRating != null && item.tmdbRating > 0 && (
                        <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
                          ★ {Number(item.tmdbRating).toFixed(1)}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3 flex flex-col gap-1 flex-1">
                      <p className="font-semibold text-sm leading-tight line-clamp-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.year}</p>
                      {item.reason && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed line-clamp-3 mt-0.5 italic">
                          {item.reason}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
