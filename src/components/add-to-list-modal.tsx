'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './ui/drawer';
import { Button } from './ui/button';
import { 
  Star, Loader2, Bookmark, CheckCircle2, History, Pencil, Trash2, 
  Calendar, Clock, Film, Tv, Activity, DollarSign, Clapperboard, Users, PlayCircle,
  ExternalLink, Info, Search, Heart, Award, Trophy, Eye, Waves, Cpu, Zap, X, Maximize2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RatingPicker } from './rating-picker';
import { DatePicker } from './date-picker';
import type { ContentType } from '@prisma/client';
import { useMediaQuery } from '@/hooks/use-media-query';
import Link from 'next/link';
import { buildContentUrl } from '@/lib/slug';
import { WatchProviders } from './ui/watch-providers';
import { RatingBadges } from './ui/rating-badges';
import Image from 'next/image';

export interface SearchResult {
  id?: string; // Internal AMDB ID (CUID)
  tmdbId?: number;
  malId?: number;
  title: string;
  year: number | null;
  posterUrl: string | null;
  tmdbRating: number | null;
  overview: string | null;
  contentType: ContentType;
  tagline?: string | null;
  genres?: { id: number; name: string }[];
  director?: string | null;
  backdropUrl?: string | null;
  budget?: number | null;
  revenue?: number | null;
  adult?: boolean;
  popularity?: number;
  spoken_languages?: any;
  production_companies?: any;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  runtimeMins?: number | null;
  first_air_date?: string;
  last_air_date?: string;
  networks?: any;
  crew?: any;
  cast?: any;
  similar?: any;
  videos?: any;
}

interface AddToListModalProps {
  item: SearchResult | null;
  onClose: () => void;
  onSuccess?: () => void;
  initialWatchStatus?: string | null;
  initialNotes?: string | null;
  initialRating?: number | null;
  startInEditMode?: boolean;
  prefetchedContent?: Record<string, any>;
}

const WATCH_STATUS_OPTIONS = [
  { value: 'WATCHING', label: 'Watching' },
  { value: 'PLAN_TO_WATCH', label: 'Plan to Watch' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DROPPED', label: 'Dropped' },
];

function formatCurrency(val?: number) {
  if (!val) return 'Unknown';
  if (val >= 1000000000) return '$' + (val / 1000000000).toFixed(1) + 'B';
  if (val >= 1000000) return '$' + (val / 1000000).toFixed(1) + 'M';
  return '$' + val.toLocaleString();
}

function ratingColor(r: number): string {
  if (r <= 3) return '#ef4444';
  if (r <= 5) return '#f97316';
  if (r <= 7) return '#eab308';
  if (r <= 9) return '#84cc16';
  return '#22c55e';
}

export function AddToListModal({
  item,
  onClose,
  onSuccess,
  initialRating,
  initialNotes,
  initialWatchStatus,
  startInEditMode,
  prefetchedContent,
}: AddToListModalProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const [rating, setRating] = React.useState<number | null>(initialRating ?? null);
  const [notes, setNotes] = React.useState(initialNotes ?? '');
  const [watchedDate, setWatchedDate] = React.useState<Date | null>(null);
  const [watchStatus, setWatchStatus] = React.useState<string>(initialWatchStatus ?? 'COMPLETED');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [episodeCount, setEpisodeCount] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const [planningToWatch, setPlanningToWatch] = React.useState(false);
  const [activeRatingLabel, setActiveRatingLabel] = React.useState<string | null>(null);
  const [activeRatingValue, setActiveRatingValue] = React.useState<number | null>(null);
  const [detailedItem, setDetailedItem] = React.useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [watchProviders, setWatchProviders] = React.useState<any>(null);
  const [providersLoading, setProvidersLoading] = React.useState(false);
  const [checkingExistence, setCheckingExistence] = React.useState(false);
  const [isRecordExisting, setIsRecordExisting] = React.useState(!!initialRating);
  const [isPlanned, setIsPlanned] = React.useState(false);
  const [plannedId, setPlannedId] = React.useState<string | null>(null);
  // For edit mode — whether the compact rating summary is in edit state
  const [editingRating, setEditingRating] = React.useState(startInEditMode || !!initialRating);

  const isEditing = isRecordExisting; // true = existing list entry


  const isSerial = item?.contentType === 'TV_SHOW' || item?.contentType === 'ANIME';
  const today = new Date();

  // Effect 1: Fetch content details — two-phase.
  // Phase 1 (quick): DB-only ~100ms — renders backdrop/overview immediately.
  // Phase 2 (full):  TMDB call ~500ms — fills in cast, providers, videos.
  // Both fire in parallel; Phase 1 resolves first and unblocks the modal render.
  // Depends on primitives so ensure() adding item.id doesn't retrigger.
  React.useEffect(() => {
    if (!item) {
      setDetailedItem(null);
      setWatchProviders(null);
      return;
    }

    // If caller already has the content data, skip the network fetch entirely
    if (prefetchedContent) {
      setDetailedItem(prefetchedContent);
      setWatchProviders(prefetchedContent.watchProviders ?? null);
      setLoadingDetails(false);
      setProvidersLoading(false);
      return;
    }

    const id = item.tmdbId ?? item.malId;
    if (!id) return;

    const controller = new AbortController();
    // Phase 2 sets this to true when it resolves so Phase 1 doesn't overwrite
    // richer data with an older/incomplete DB record (race condition).
    let phase2Done = false;
    setLoadingDetails(true);
    setProvidersLoading(true);

    // Phase 1: DB-only fast path (tmdbId content only — malId-only anime skips this)
    if (item.tmdbId) {
      fetch(`/api/content/${id}?type=${item.contentType}&quick=1`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (!data.error && !phase2Done) {
            setDetailedItem(data);
            setLoadingDetails(false);
          }
        })
        .catch(() => {});
    }

    // Phase 2: Full TMDB data — always wins over Phase 1
    fetch(`/api/content/${id}?type=${item.contentType}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        phase2Done = true;
        if (!data.error) {
          setDetailedItem(data);
          setWatchProviders(data.watchProviders ?? null);
        }
      })
      .catch(() => {})
      .finally(() => {
        setLoadingDetails(false);
        setProvidersLoading(false);
      });

    return () => controller.abort();
  }, [item?.tmdbId, item?.malId, item?.contentType]);

  // Effect 2: Check if item already exists in watched list.
  // Depends only on primitive IDs so it is NOT cancelled when ensure() adds item.id.
  React.useEffect(() => {
    if (!item || initialRating) return;
    if (!item.tmdbId && !item.malId) return;

    setCheckingExistence(true);
    let cancelled = false;

    const params = new URLSearchParams();
    if (item.tmdbId) params.set('tmdbId', String(item.tmdbId));
    if (item.malId) params.set('malId', String(item.malId));

    fetch(`/api/list/check?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.exists) {
          setRating(data.userRating);
          setNotes(data.notes ?? '');
          setWatchStatus(data.watchStatus ?? 'COMPLETED');
          setEditingRating(true);
          setIsRecordExisting(true);
        }
        if (data.planned) {
          setIsPlanned(true);
          setPlannedId(data.plannedId);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setCheckingExistence(false); });

    return () => { cancelled = true; };
  }, [item?.tmdbId, item?.malId, initialRating]);

  async function handleSubmit() {
    if (!item || !rating) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        tmdbId: item.tmdbId ?? item.malId,
        contentType: item.contentType,
        userRating: rating,
        notes: notes.trim() || undefined,
      };
      if (!isSerial && watchedDate) body.watchedDate = watchedDate.toISOString();
      if (isSerial) {
        body.watchStatus = watchStatus;
        if (startDate) body.startDate = startDate.toISOString();
        if (endDate) body.endDate = endDate.toISOString();
        if (episodeCount) body.episodeCount = Number(episodeCount);
      }
      await fetch('/api/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlanToWatch() {
    if (!item) return;
    setPlanningToWatch(true);
    try {
      // Ensure the Content record exists first
      let contentId = item.id;
      if (!contentId && (item.tmdbId || item.malId)) {
        const ensureRes = await fetch('/api/content/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId: item.tmdbId,
            malId:  item.malId,
            contentType: item.contentType,
          }),
        });
        if (ensureRes.ok) {
          const ensureData = await ensureRes.json();
          contentId = ensureData.amdbId;
        }
      }
      if (!contentId) return;

      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId, contentType: item.contentType }),
      });
      if (res.ok) {
        onClose();
        onSuccess?.();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPlanningToWatch(false);
    }
  }

  async function handleRemoveFromPlan() {
    if (!plannedId) return;
    // Optimistic update — flip state immediately, modal stays open
    setIsPlanned(false);
    setPlannedId(null);
    try {
      await fetch(`/api/watchlist/${plannedId}`, { method: 'DELETE' });
    } catch {
      // Revert on failure
      setIsPlanned(true);
      setPlannedId(plannedId);
    }
  }

  if (!item) return null;
  const displayItem = detailedItem ?? item;

  const trailer = displayItem.videos?.results?.find(
    (v: any) => v.type === 'Trailer' && v.site === 'YouTube',
  );
  const similarItems = displayItem.similar?.results?.slice(0, 8) ?? [];
  const cast = displayItem.cast ?? [];

  let airedDateRange = '';
  if (displayItem.first_air_date) {
    const first = new Date(displayItem.first_air_date).getFullYear();
    const lastD = displayItem.last_air_date ? new Date(displayItem.last_air_date) : null;
    const lastStr = !lastD
      ? 'Ongoing'
      : today.getTime() - lastD.getTime() < 7 * 24 * 60 * 60 * 1000
        ? 'Ongoing'
        : lastD.getFullYear().toString();
    airedDateRange = `${first} – ${lastStr}`;
  }

  // ── Compact rating summary shown when editing=false ─────────────────────────
  const CompactRatingBar = (
    <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-white shrink-0"
        style={{ backgroundColor: rating ? ratingColor(rating) : '#3f3f46' }}
      >
        {rating ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">
          {rating ? `Rated ${rating}/10` : 'Not rated yet'}
        </p>
        {notes ? (
          <p className="text-xs text-white/50 truncate italic">"{notes}"</p>
        ) : (
          <p className="text-xs text-white/30">No review</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setEditingRating(true)}
        className="shrink-0 hover:bg-white/10 text-white/60 hover:text-white"
      >
        <Pencil className="w-4 h-4" />
      </Button>
    </div>
  );

  const FullRatingForm = (
    <div className="space-y-5">
      {/* For movies: rating + date side by side on desktop */}
      {!isSerial ? (
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:items-start">
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-sm font-medium text-white/90">
                Your rating <span className="text-destructive">*</span>
              </p>
              <motion.span
                key={activeRatingLabel ?? 'none'}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm font-semibold"
                style={{
                  color: activeRatingValue
                    ? ratingColor(activeRatingValue)
                    : 'rgba(255,255,255,0.25)',
                }}
              >
                {activeRatingLabel ?? 'Select a rating'}
              </motion.span>
            </div>
            <div className="mt-3">
              <RatingPicker
                value={rating}
                onChange={setRating}
                onActiveRating={(r) => {
                  setActiveRatingValue(r);
                  setActiveRatingLabel(
                    r
                      ? (
                          {
                            1: 'Unwatchable',
                            2: 'Terrible',
                            3: 'Bad',
                            4: 'Below average',
                            5: 'Average',
                            6: 'Decent',
                            7: 'Good',
                            8: 'Great',
                            9: 'Excellent',
                            10: 'Masterpiece',
                          } as Record<number, string>
                        )[r]
                      : null,
                  );
                }}
              />
            </div>
          </div>
          <div className="md:w-56 shrink-0">
            <p className="text-sm font-medium mb-3 text-white/80">
              Date watched <span className="text-white/40 text-xs">(optional)</span>
            </p>
            <div className="flex gap-2 mt-3">
              <DatePicker
                value={watchedDate}
                onChange={setWatchedDate}
                placeholder="Pick"
                maxDate={today}
                minYear={displayItem.year ?? 1900}
                className="flex-1 bg-black/50 border-white/10 text-white text-xs h-9 md:h-11"
              />
              <button
                type="button"
                onClick={() => setWatchedDate(new Date())}
                className="shrink-0 text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all h-9 md:h-11"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* For serials: rating full width, then watch status + episodes grid */
        <>
          <div>
            <p className="text-sm font-medium mb-3 text-white/90">
              Your rating <span className="text-destructive">*</span>
            </p>
            <RatingPicker value={rating} onChange={setRating} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium mb-2 text-white/80">Watch status</p>
              <Select value={watchStatus} onValueChange={setWatchStatus}>
                <SelectTrigger className="bg-black/50 border-white/10 text-base md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-zinc-900 text-white">
                  {WATCH_STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 text-white/80">Episodes watched</p>
              <input
                type="number"
                min={0}
                value={episodeCount}
                onChange={(e) => setEpisodeCount(e.target.value)}
                placeholder="e.g. 12"
                className="flex h-9 w-full rounded-md border border-white/10 bg-black/50 px-3 py-1 text-base md:text-sm shadow-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              />
            </div>
          </div>
        </>
      )}

      <div className="md:flex items-start gap-3">
        <div className="flex items-baseline gap-1 shrink-0 pt-2.5 md:flex-col md:items-start md:gap-0">
          <p className="text-sm font-medium text-white/80 leading-tight">Review</p>
          <span className="text-white/40 text-xs leading-tight">(optional)</span>
        </div>
        <div className="flex-1 flex flex-col rounded-md border border-white/10 bg-black/50 focus-within:ring-1 focus-within:ring-ring overflow-hidden">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 500))}
            placeholder='e.g. "Ending was super confusing"'
            maxLength={500}
            rows={2}
            className="w-full bg-transparent resize-none placeholder:text-white/30 text-white text-base md:text-sm px-3 pt-2 outline-none"
          />
          <div className="flex justify-end px-2.5 pb-1.5">
            <span
              className={`text-[10px] tabular-nums ${notes.length >= 450 ? 'text-orange-400' : 'text-white/25'}`}
            >
              {500 - notes.length}
            </span>
          </div>
        </div>
      </div>

      {isEditing && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditingRating(false)}
          className="text-white/40 hover:text-white/70 -mt-2"
        >
          <Check className="w-3 h-3 mr-1" /> Collapse
        </Button>
      )}
    </div>
  );

  const InnerContent = (
    // outer: flex col, fill height, no overflow — children handle scroll
    <div className="relative flex flex-col h-full bg-black text-white overflow-hidden">
      {/* ── Scrollable body ─────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {/* Backdrop hero */}
        <div className="relative w-full min-h-[35vh] sm:min-h-[45vh] shrink-0">
          <div className="absolute inset-0 z-0">
            {displayItem.backdropUrl ? (
              <Image
                
                src={displayItem.backdropUrl}
                alt=""
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 1280px"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>

          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {(() => {
              const pid = item.id;
              if (!pid) return null;
              const url = buildContentUrl(item.contentType, displayItem.title, pid);
              return (
                <Link
                  href={url}
                  onClick={onClose}
                  className="p-2 bg-black/40 hover:bg-black/80 rounded-full backdrop-blur-md transition-all text-white/60 hover:text-white shadow-xl border border-white/5"
                  title="View full page"
                >
                  <Maximize2 className="w-5 h-5" />
                </Link>
              );
            })()}
            <button
              onClick={onClose}
              className="p-2 bg-black/40 hover:bg-black/80 rounded-full backdrop-blur-md transition-all border border-white/5"
              title="Close"
            >
              <X className="w-5 h-5 text-white/80 hover:text-white" />
            </button>
          </div>

          <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-end z-10">
            {displayItem.posterUrl && (
              <div className="relative w-24 sm:w-32 aspect-[2/3] rounded-xl shadow-2xl border border-white/10 hidden sm:block overflow-hidden">
                <Image
                  
                  src={displayItem.posterUrl}
                  alt="Poster"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 640px) 96px, 128px"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {displayItem.adult && (
                  <Badge variant="destructive" className="font-bold border-0 h-5">
                    18+
                  </Badge>
                )}
                {displayItem.networks?.[0] && (
                  <Badge
                    variant="outline"
                    className="bg-white/10 border-white/10 backdrop-blur-md h-5"
                  >
                    {displayItem.networks[0].name}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-xl">
                {displayItem.title}{' '}
                {displayItem.year ? (
                  <span className="text-white/40 font-light">({displayItem.year})</span>
                ) : (
                  ''
                )}
              </h2>
              {displayItem.tagline && (
                <p className="text-sm text-white/70 italic mt-1 font-light">
                  "{displayItem.tagline}"
                </p>
              )}

              {/* Unified Scrollable Metadata (Consistent with Details Page) */}
              {((displayItem.genres && displayItem.genres.length > 0) ||
                displayItem.runtimeMins ||
                airedDateRange) && (
                <div className="flex items-center overflow-x-auto gap-2.5 mt-2 pb-1 no-scrollbar pr-4 select-none">
                  {airedDateRange && (
                    <span className="px-2 py-0.5 whitespace-nowrap text-[10px] font-bold text-white/40 bg-white/5 border border-white/5 rounded px-2 shadow-sm">
                      {airedDateRange}
                    </span>
                  )}
                  {displayItem.runtimeMins && (
                    <span className="px-2 py-0.5 whitespace-nowrap text-[10px] font-black text-white/60 bg-white/5 border border-white/10 rounded px-2 flex items-center gap-1 shadow-sm">
                      <Clock className="w-2.5 h-2.5 opacity-60" /> {displayItem.runtimeMins}m
                    </span>
                  )}
                  {displayItem.episode_run_time?.[0] && (
                    <span className="px-2 py-0.5 whitespace-nowrap text-[10px] font-black text-white/60 bg-white/5 border border-white/10 rounded px-2 flex items-center gap-1 shadow-sm">
                      <Clock className="w-2.5 h-2.5 opacity-60" /> {displayItem.episode_run_time[0]}
                      m/ep
                    </span>
                  )}

                  {displayItem.genres && displayItem.genres.length > 0 && (
                    <div className="w-px h-3 bg-white/10 shrink-0 mx-1" />
                  )}

                  {displayItem.genres &&
                    displayItem.genres.map((g: any) => (
                      <span
                        key={g.id}
                        className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 text-[10px] font-black border border-white/5 whitespace-nowrap uppercase tracking-tight shadow-md"
                      >
                        {g.name}
                      </span>
                    ))}
                </div>
              )}
              <RatingBadges
                tmdbRating={displayItem.tmdbRating}
                omdbRatings={displayItem.omdbRatings}
                malScore={displayItem.malScore}
                className="mt-2"
              />

              {/* Shared WatchProvider Component (Integrated into Hero) */}
              {(providersLoading || watchProviders) && (
                <div className="mt-2 pt-2 border-t border-white/10">
                  {providersLoading ? (
                    <div className="flex gap-2.5 animate-pulse">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-7 h-7 rounded-lg bg-white/10" />
                      ))}
                    </div>
                  ) : (
                    <WatchProviders
                      providers={watchProviders}
                      title={displayItem.title}
                      className="gap-x-6 gap-y-3"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="p-4 sm:px-6 flex flex-col gap-6">
          <div className="pt-1">
            {checkingExistence ? (
              <div className="h-16 w-full rounded-2xl bg-white/5 animate-pulse flex items-center justify-center border border-white/10">
                <Loader2 className="w-5 h-5 text-white/20 animate-spin" />
              </div>
            ) : editingRating ? (
              FullRatingForm
            ) : (
              CompactRatingBar
            )}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm p-3 bg-white/5 rounded-2xl border border-white/10">
            {displayItem.popularity && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Popularity
                </span>
                <span className="font-medium text-white/90">
                  {Number(displayItem.popularity).toFixed(0)}
                </span>
              </div>
            )}
            {(displayItem.budget || displayItem.revenue) && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Box Office
                </span>
                <span className="font-medium text-white/90">
                  {formatCurrency(displayItem.revenue || displayItem.budget)}
                </span>
              </div>
            )}
            {airedDateRange && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Timeline
                </span>
                <span className="font-medium text-white/90">{airedDateRange}</span>
              </div>
            )}
            {(displayItem.number_of_seasons || displayItem.number_of_episodes) && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                  <Clapperboard className="w-3 h-3" /> Layout
                </span>
                <span className="font-medium text-white/90">
                  {displayItem.number_of_seasons
                    ? displayItem.number_of_seasons + ' Seasons · '
                    : ''}
                  {displayItem.number_of_episodes} Episodes
                </span>
              </div>
            )}
            {displayItem.production_companies?.length > 0 && (
              <div className="flex flex-col lg:col-span-2">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1">
                  Production
                </span>
                <span className="font-medium text-white/90 truncate">
                  {displayItem.production_companies.map((p: any) => p.name).join(', ')}
                </span>
              </div>
            )}
            {displayItem.spoken_languages?.length > 0 && (
              <div className="flex flex-col lg:col-span-2">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1">
                  Languages
                </span>
                <span className="font-medium text-white/90">
                  {displayItem.spoken_languages.map((l: any) => l.english_name).join(', ')}
                </span>
              </div>
            )}
          </div>

          {/* Overview */}
          <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">
            {displayItem.overview}
          </p>

          {/* Crew */}
          {displayItem.crew &&
            (displayItem.crew.director || displayItem.crew.writer || displayItem.crew.producer) && (
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {displayItem.crew.director && (
                  <div>
                    <p className="text-white font-bold">{displayItem.crew.director}</p>
                    <p className="text-xs text-white/50">Director</p>
                  </div>
                )}
                {displayItem.crew.writer && (
                  <div>
                    <p className="text-white font-bold">{displayItem.crew.writer}</p>
                    <p className="text-xs text-white/50">Writer</p>
                  </div>
                )}
                {displayItem.crew.producer && (
                  <div>
                    <p className="text-white font-bold">{displayItem.crew.producer}</p>
                    <p className="text-xs text-white/50">Producer</p>
                  </div>
                )}
              </div>
            )}

          {/* Trailer */}
          {trailer && (
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?modestbranding=1&rel=0`}
                className="w-full h-full"
                allowFullScreen
              />
            </div>
          )}

          {/* Cast */}
          {cast.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Top Cast
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x pr-4">
                {cast.map((actor: any) => (
                  <div key={actor.id} className="w-24 shrink-0 snap-start flex flex-col">
                    {actor.profile_path ? (
                      <div className="relative w-full aspect-[2/3] rounded-xl border border-white/10 mb-2 overflow-hidden">
                        <Image
                          
                          src={actor.profile_path}
                          alt={actor.name}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-[2/3] bg-white/5 rounded-xl border border-white/10 mb-2 flex items-center justify-center p-2 text-center text-xs text-white/30">
                        {actor.name}
                      </div>
                    )}
                    <p className="text-xs font-bold leading-tight truncate">{actor.name}</p>
                    <p className="text-[10px] text-white/50 line-clamp-2 leading-tight mt-0.5">
                      {actor.character}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similar */}
          {similarItems.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-white/10 pb-4">
              <h3 className="text-xl font-bold">Similar Titles</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {similarItems.map((s: any) => {
                  const detectedType =
                    s.media_type === 'tv'
                      ? 'TV_SHOW'
                      : item.contentType === 'ANIME'
                        ? 'ANIME'
                        : 'MOVIE';
                  const displayId = s.id || s.mal_id;
                  const simTitle = s.title || s.name || s.title_english || 'Unknown';

                  return (
                    <button
                      key={displayId}
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/content/ensure', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              tmdbId: s.id,
                              malId: s.mal_id,
                              contentType: detectedType,
                            }),
                          });
                          if (res.ok) {
                            const { amdbId } = await res.json();
                            router.push(buildContentUrl(detectedType, simTitle, amdbId));
                            onClose();
                          }
                        } catch (e) {
                          console.error('Similar nav error:', e);
                        }
                      }}
                      className="block group text-left"
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative">
                        {s.poster_path || s.images?.jpg?.large_image_url ? (
                          <Image

                            src={s.poster_path || s.images.jpg.large_image_url}
                            alt={simTitle}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            sizes="(max-width: 640px) 33vw, 150px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-center p-2 text-xs text-white/50">
                            {simTitle}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center flex-col p-2 text-center">
                          <PlayCircle className="w-8 h-8 text-white mb-2" />
                          <span className="text-xs font-bold leading-tight">{simTitle}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky CTA bar ─────────────────────────────── */}
      {editingRating && (
        <div className="shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 justify-center">
          {checkingExistence ? (
            // While the existence check is running, show a neutral loading button
            <div className="flex-1 max-w-md mx-auto h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-white/40" />
              <span className="text-sm text-white/40 uppercase tracking-tight font-bold">Checking...</span>
            </div>
          ) : (
            <>
              {!isEditing && (
                <button
                  onClick={isPlanned ? handleRemoveFromPlan : handlePlanToWatch}
                  disabled={planningToWatch || submitting}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border transition-all disabled:opacity-50",
                    isPlanned
                      ? "border-primary/60 bg-primary/20 text-primary hover:bg-primary/10"
                      : "border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  )}
                >
                  {planningToWatch ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/40" />
                  ) : (
                    <Bookmark className={cn("w-4 h-4", isPlanned && "fill-current")} />
                  )}
                  <span className="text-sm font-bold uppercase tracking-tight">
                    {isPlanned ? 'Planned' : 'Plan'}
                  </span>
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!rating || submitting || planningToWatch}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-all disabled:opacity-50",
                  isEditing && "max-w-md mx-auto"
                )}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="text-sm font-bold uppercase tracking-tight">
                    {isEditing ? 'Update List' : 'Add to List'}
                  </span>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border border-white/10 shadow-2xl h-[88vh] flex flex-col">
          <DialogTitle className="sr-only">Details for {displayItem.title}</DialogTitle>
          <DialogDescription className="sr-only">Detailed view and metadata</DialogDescription>
          {InnerContent}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-black border-white/10 p-0 overflow-hidden outline-none h-[92vh] flex flex-col">
        <DrawerTitle className="sr-only">Details for {displayItem.title}</DrawerTitle>
        <DrawerDescription className="sr-only">Detailed view and metadata</DrawerDescription>
        {InnerContent}
      </DrawerContent>
    </Drawer>
  );
}
