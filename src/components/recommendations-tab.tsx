'use client';

import * as React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, History, Star, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { MovieCard } from './movie-card';
import type { SearchResult } from './add-to-list-modal';
import type { ContentType } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { ListFilterBar, DEFAULT_FILTERS, type ListFilters } from './list-filter-bar';

// ─── Types ───────────────────────────────────────────────────────────────────
// ... (rest of types)

type ModelId =
  | 'gemma-4-31b-it'
  | 'gemini-2.5-flash'
  | 'gemini-3-flash-preview'
  | 'gemini-3.1-flash-lite-preview';

const AI_MODELS: { id: ModelId; label: string; premium: boolean }[] = [
  { id: 'gemma-4-31b-it',                label: 'Gemma 4 31B',           premium: false },
  { id: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash',      premium: false },
  { id: 'gemini-3-flash-preview',        label: 'Gemini 3 Flash',        premium: true  },
  { id: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite', premium: false },
];

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'MOVIE',   label: 'Movie' },
  { value: 'TV_SHOW', label: 'TV Show' },
  { value: 'ANIME',   label: 'Anime' },
];

const GENRES = [
  'Action','Adventure','Animation','Comedy','Crime','Documentary','Drama',
  'Fantasy','Horror','Mystery','Romance','Sci-Fi','Thriller','Western',
  'Isekai','Mecha','Slice of Life','Sports','Supernatural',
];

interface HistoryEntry {
  id: string;
  contentType: string;
  createdAt: string;
  recommendationReason?: string | null;
  recommendationLabel?: string | null;
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

interface PendingRecommendation {
  tempId: string;
  title: string;
  year: number;
  reason: string;
  label: string;
  contentType: ContentType | 'ANY';
}

interface RecommendationsTabProps {
  profileId: string;
  onSelect: (item: SearchResult) => void;
  refreshTrigger?: number;
}

// ─── ModelDropdown ────────────────────────────────────────────────────────────

function ModelDropdown({ value, onChange }: { value: ModelId; onChange: (v: ModelId) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const selected = AI_MODELS.find((m) => m.id === value)!;

  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium text-foreground cursor-pointer hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          {selected.label}
          {selected.premium && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white leading-none">
              PREMIUM
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-lg shadow-xl overflow-hidden">
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => { onChange(m.id); setOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm text-left transition-colors hover:bg-accent ${m.id === value ? 'bg-accent/60 font-semibold' : 'font-medium'}`}
            >
              {m.label}
              {m.premium && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-orange-500 text-white leading-none shrink-0">
                  PREMIUM
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── GenerateModal ────────────────────────────────────────────────────────────

interface GenerateModalProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (types: ContentType[], genres: string[], model: ModelId, specialInstructions?: string) => void;
}

function GenerateModal({ open, onClose, onGenerate }: GenerateModalProps) {
  const [types, setTypes]     = React.useState<ContentType[]>([]);
  const [genres, setGenres]   = React.useState<string[]>([]);
  const [model, setModel]     = React.useState<ModelId>('gemma-4-31b-it');
  const [specialInstructions, setSpecialInstructions] = React.useState('');

  function toggleType(t: ContentType) {
    setTypes((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  function handleGenerate() {
    onGenerate(types, genres, model, specialInstructions);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-card border-border p-0 flex flex-col max-h-[90vh]">
        <div className="p-5 pb-0 shrink-0">
          <DialogTitle className="text-base font-bold">Generate Recommendations</DialogTitle>
          <DialogDescription className="sr-only">
            Choose content type, genres, and AI model, then generate personalised recommendations.
          </DialogDescription>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Content Type — multi-select badges in one line */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Content Type <span className="text-xs text-muted-foreground/60">(any if none selected)</span>
            </p>
            <div className="flex gap-2">
              {CONTENT_TYPES.map(({ value, label }) => (
                <Badge
                  key={value}
                  variant={types.includes(value) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                  onClick={() => toggleType(value)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Genres</p>
              {genres.length > 0 && (
                <button
                  onClick={() => setGenres([])}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((g) => (
                <Badge
                  key={g}
                  variant={genres.includes(g) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 transition-opacity text-xs"
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>

          {/* AI Model */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">AI Model</p>
            <ModelDropdown value={model} onChange={setModel} />
          </div>

          {/* Special Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Special Instructions <span className="text-xs text-muted-foreground/60">(optional)</span></p>
              <span className="text-[10px] text-muted-foreground">{specialInstructions.length}/200</span>
            </div>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
              placeholder='e.g. "Something under 2 hours", "90s classics"'
              className="w-full h-16 bg-background border border-border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
            />
          </div>
        </div>

        <div className="p-5 pt-0 shrink-0">
          <Button
            onClick={handleGenerate}
            className="w-full font-bold gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-0 text-white shadow-lg"
          >
            <Sparkles className="w-4 h-4" />
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── RecommendationsTab ───────────────────────────────────────────────────────

export function RecommendationsTab({ profileId, onSelect, refreshTrigger }: RecommendationsTabProps) {
  const [historyItems, setHistoryItems]     = React.useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = React.useState(true);
  const [historyPage, setHistoryPage]       = React.useState(1);
  const [historyTotalPages, setHistoryTotalPages] = React.useState(0);
  const [historyTotal, setHistoryTotal]           = React.useState(0);
  const [filters, setFilters]                     = React.useState<ListFilters>(DEFAULT_FILTERS);

  const [generating, setGenerating]               = React.useState(false);
  const [generatingStatus, setGeneratingStatus]   = React.useState('');
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [pendingRecs, setPendingRecs]             = React.useState<PendingRecommendation[]>([]);
  const [bookmarking, setBookmarking]             = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting]                   = React.useState<Set<string>>(new Set());
  const { toast } = useToast();

  async function fetchHistory(page: number, f: ListFilters) {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        profileId,
        page: String(page),
      });
      if (f.contentType !== 'ALL') params.set('contentType', f.contentType);
      
      const res = await fetch(`/api/recommendations/history?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHistoryItems(data.items ?? []);
      setHistoryPage(data.page);
      setHistoryTotalPages(data.totalPages);
      setHistoryTotal(data.total);
    } catch {
      // show empty state
    } finally {
      setHistoryLoading(false);
    }
  }

  React.useEffect(() => {
    if (profileId) {
      fetchHistory(1, filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, filters, refreshTrigger]);

  async function handleGenerate(types: ContentType[], genres: string[], model: ModelId, specialInstructions?: string) {
    setShowGenerateModal(false);
    setGenerating(true);

    try {
      // 1. Phase 1: Fetching Data
      setGeneratingStatus('Fetching data');
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, contentTypes: types, genres, model, specialInstructions }),
      });
      
      // 2. Phase 2: Getting Recommendations
      setGeneratingStatus('Getting recommendations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate recommendations');

      const rawRecs = data.recommendations || [];
      if (rawRecs.length === 0) throw new Error('No recommendations generated');

      // 3. Instant Placeholder Creation
      setPendingRecs(rawRecs.map((r: any, idx: number) => ({
        tempId: `pending-${Date.now()}-${idx}`,
        title: r.title,
        year: r.year,
        reason: r.reason,
        label: r.label,
        contentType: types[0] ?? 'MOVIE',
      })));

      // 4. Phase 3: Getting Details (Enrichment)
      setGeneratingStatus('Getting details');
      
      const enrichmentPromises = rawRecs.map(async (raw: any) => {
        try {
          const enrichRes = await fetch('/api/recommendations/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId, title: raw.title, year: raw.year, reason: raw.reason, label: raw.label }),
          });
          const enrichedData = await enrichRes.json();
          if (enrichRes.ok) {
            setHistoryItems((prev) => {
              if (prev.some(item => item.id === enrichedData.id)) return prev;
              return [enrichedData, ...prev];
            });
            // Remove from pending once enriched
            setPendingRecs((prev) => prev.filter(p => p.title !== raw.title));
          }
        } catch (e) {
          console.error('Enrichment failed for', raw.title, e);
          // Remove the stuck pending card so it doesn't hang forever
          setPendingRecs((prev) => prev.filter(p => p.title !== raw.title));
        }
      });

      await Promise.all(enrichmentPromises);
      setPendingRecs([]); // clear any remaining pending cards
      toast({ title: 'Suggestions ready!' });

    } catch (err: any) {
      toast({
        title: 'Recommendation failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
      setGeneratingStatus('');
    }
  }

  async function handleBookmark(entry: HistoryEntry) {
    setBookmarking((prev) => new Set([...prev, entry.id]));
    try {
      const res = await fetch(`/api/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, contentId: entry.content.id, contentType: entry.content.contentType }),
      });
      if (res.ok) {
        setHistoryItems((prev) => prev.filter((e) => e.id !== entry.id));
        toast({ title: 'Added to planned' });
      }
    } finally {
      setBookmarking((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  }
  
  async function handleDelete(entry: HistoryEntry) {
    setDeleting((prev) => new Set([...prev, entry.id]));
    try {
      const res = await fetch(`/api/recommendations/${entry.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setHistoryItems((prev) => prev.filter((e) => e.id !== entry.id));
        toast({ title: 'Recommendation removed' });
      }
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    }
  }

  const isFiltered = filters.contentType !== 'ALL';

  return (
    <div className="relative space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ListFilterBar filters={filters} onChange={setFilters} total={historyTotal} />

      {/* Empty state */}
      {!historyLoading && !generating && historyItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed border-border rounded-2xl text-center">
          <History className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-lg font-medium mb-1 text-foreground">
            {isFiltered ? 'No matches found' : 'No recommendations yet'}
          </p>
          <p className="text-sm opacity-80 max-w-sm">
            {isFiltered
              ? 'Try adjusting your filters to see more results.'
              : 'Hit Generate to get personalised recommendations based on your ratings history.'}
          </p>
        </div>
      )}

      {/* Loading skeleton on first load */}
      {historyLoading && historyPage === 1 && (
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
      )}

      {/* Card grid */}
      {(!historyLoading || historyPage > 1) && (historyItems.length > 0 || generating) && (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-6">
              {/* Pending Items */}
              {pendingRecs.map((pending) => (
                <div key={pending.tempId} className="md:col-span-2">
                  <MovieCard
                    id={pending.tempId}
                    title={pending.title}
                    year={pending.year}
                    posterUrl={null}
                    contentType={pending.contentType === 'ANY' ? 'MOVIE' : pending.contentType as ContentType}
                    tmdbRating={null}
                    variant="RECOMMENDED"
                    layout="horizontal"
                    recommendationReason={pending.reason}
                    recommendationLabel={pending.label}
                    isEnriching={true}
                  />
                </div>
              ))}

              {/* Real Items */}
              {historyItems.map((entry) => {
                const item = entry.content;
                const isBookmarking = bookmarking.has(entry.id);
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
                      variant="RECOMMENDED"
                      layout="horizontal"
                      onDelete={() => handleDelete(entry)}
                      isSecondaryLoading={isBookmarking}
                      onSecondaryAction={() => handleBookmark(entry)}
                      recommendationReason={entry.recommendationReason}
                      recommendationLabel={entry.recommendationLabel}
                      onViewDetails={() => onSelect({
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
                  </div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {historyTotalPages > 1 && !historyLoading && (
        <div className="flex items-center justify-center gap-3 pt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={historyPage === 1}
            onClick={() => fetchHistory(historyPage - 1, filters)}
          >
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            {historyPage} / {historyTotalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={historyPage === historyTotalPages}
            onClick={() => fetchHistory(historyPage + 1, filters)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Sticky Generate FAB */}
      <div className="fixed bottom-24 md:bottom-10 right-6 z-40">
        <button
          onClick={() => setShowGenerateModal(true)}
          disabled={generating}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 disabled:opacity-70 text-white font-bold px-5 py-3 rounded-full shadow-2xl shadow-purple-500/30 transition-all hover:scale-105 active:scale-95"
        >
          {generating ? (
            <Star className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {generating ? generatingStatus + '...' : 'Generate'}
        </button>
      </div>

      {/* Generate Modal */}
      <GenerateModal
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
