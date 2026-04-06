'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from './ui/drawer';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Loader2, X, Users, Clapperboard, Calendar, DollarSign, Activity, Pencil, Check, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { RatingPicker } from './rating-picker';
import { DatePicker } from './date-picker';
import type { ContentType } from '@prisma/client';
import { useMediaQuery } from '@/hooks/use-media-query';
import Link from 'next/link';
import { buildContentUrl } from '@/lib/slug';
import { PlayCircle } from 'lucide-react';

export interface SearchResult {
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
  profileId: string;
  onClose: () => void;
  onSuccess: () => void;
  initialWatchStatus?: string | null;
  initialNotes?: string | null;
  initialRating?: number | null;
  startInEditMode?: boolean;
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
  profileId,
  onClose,
  onSuccess,
  initialRating,
  initialNotes,
  initialWatchStatus,
  startInEditMode,
}: AddToListModalProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const isEditing = !!initialRating; // true = existing list entry being re-opened

  const [rating, setRating] = React.useState<number | null>(initialRating ?? null);
  const [notes, setNotes] = React.useState(initialNotes ?? '');
  const [watchedDate, setWatchedDate] = React.useState<Date | null>(null);
  const [watchStatus, setWatchStatus] = React.useState<string>(initialWatchStatus ?? 'COMPLETED');
  const [startDate, setStartDate] = React.useState<Date | null>(null);
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [episodeCount, setEpisodeCount] = React.useState<string>('');
  const [submitting, setSubmitting] = React.useState(false);
  const [detailedItem, setDetailedItem] = React.useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  // For edit mode — whether the compact rating summary is in edit state
  const [editingRating, setEditingRating] = React.useState(startInEditMode || !isEditing);

  const isSerial = item?.contentType === 'TV_SHOW' || item?.contentType === 'ANIME';
  const today = new Date();

  React.useEffect(() => {
    if (!item) { setDetailedItem(null); return; }
    const controller = new AbortController();
    setLoadingDetails(true);
    fetch(`/api/content/${item.tmdbId ?? item.malId}?type=${item.contentType}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => { if (!data.error) setDetailedItem(data); })
      .catch(() => {})
      .finally(() => setLoadingDetails(false));
    return () => controller.abort();
  }, [item]);

  async function handleSubmit() {
    if (!item || !rating) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        profileId,
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
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) return null;
  const displayItem = detailedItem ?? item;

  const trailer = displayItem.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
  const similarItems = displayItem.similar?.results?.slice(0, 8) ?? [];
  const cast = displayItem.cast ?? [];

  let airedDateRange = '';
  if (displayItem.first_air_date) {
    const first = new Date(displayItem.first_air_date).getFullYear();
    const lastD = displayItem.last_air_date ? new Date(displayItem.last_air_date) : null;
    const lastStr = !lastD
      ? 'Ongoing'
      : (today.getTime() - lastD.getTime()) < 7 * 24 * 60 * 60 * 1000
        ? 'Ongoing'
        : lastD.getFullYear().toString();
    airedDateRange = `Aired: ${first} – ${lastStr}`;
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
        <p className="text-sm font-semibold text-white">{rating ? `Rated ${rating}/10` : 'Not rated yet'}</p>
        {notes ? (
          <p className="text-xs text-white/50 truncate italic">"{notes}"</p>
        ) : (
          <p className="text-xs text-white/30">No notes</p>
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

  // ── Full editable rating form ────────────────────────────────────────────────
  const FullRatingForm = (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium mb-3 text-white/90">
          Your rating <span className="text-destructive">*</span>
        </p>
        <RatingPicker value={rating} onChange={setRating} />
      </div>

      {isSerial && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2 text-white/80">Watch status</p>
            <Select value={watchStatus} onValueChange={setWatchStatus}>
              <SelectTrigger className="bg-black/50 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-zinc-950 border-zinc-900 text-white">
                {WATCH_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
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
              className="flex h-9 w-full rounded-md border border-white/10 bg-black/50 px-3 py-1 text-sm shadow-sm placeholder:text-white/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        </div>
      )}

      {!isSerial && (
        <div>
          <p className="text-sm font-medium mb-2 text-white/80">Date watched <span className="text-white/40 text-xs">(optional)</span></p>
          <DatePicker
            value={watchedDate}
            onChange={setWatchedDate}
            placeholder="When did you watch it?"
            maxDate={today}
            className="w-full bg-black/50 border-white/10 text-white"
          />
        </div>
      )}

      <div>
        <p className="text-sm font-medium mb-2 text-white/80">Notes <span className="text-white/40 text-xs">(optional)</span></p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='e.g. "Ending was super confusing"'
          maxLength={500}
          rows={3}
          className="bg-black/50 border-white/10 resize-none placeholder:text-white/30 text-white"
        />
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
        <div className="relative w-full h-[28vh] sm:h-[38vh] shrink-0">
          <div className="absolute inset-0 z-0">
            {displayItem.backdropUrl ? (
              <img src={displayItem.backdropUrl} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950 to-black" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          </div>

          <button onClick={onClose} className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/80 rounded-full backdrop-blur-md transition-all">
            <X className="w-5 h-5 text-white/80 hover:text-white" />
          </button>

          <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-end z-10">
            {displayItem.posterUrl && (
              <img src={displayItem.posterUrl} className="w-24 sm:w-32 rounded-xl shadow-2xl border border-white/10 hidden sm:block" alt="Poster" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {displayItem.adult && <Badge variant="destructive" className="font-bold border-0 h-5">18+</Badge>}
                {displayItem.networks?.[0] && (
                  <Badge variant="outline" className="bg-white/10 border-white/10 backdrop-blur-md h-5">{displayItem.networks[0].name}</Badge>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight drop-shadow-xl">
                {displayItem.title} {displayItem.year ? <span className="text-white/40 font-light">({displayItem.year})</span> : ''}
              </h2>
              {displayItem.tagline && <p className="text-sm text-white/70 italic mt-1 font-light">"{displayItem.tagline}"</p>}
              {/* View full page link */}
              {(() => {
                const pid = item.tmdbId ?? item.malId;
                if (!pid) return null;
                const url = buildContentUrl(item.contentType, displayItem.title, pid);
                return (
                  <Link href={url} onClick={onClose}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/90 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> View full page
                  </Link>
                );
              })()}

              {/* OMDB Ratings Row */}
              {displayItem.omdbRatings && displayItem.omdbRatings.length > 0 && (
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  {displayItem.omdbRatings.map((r: any) => (
                    <div key={r.Source} className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                      {r.Source === 'Rotten Tomatoes' && <span className="text-[10px] font-black text-red-500 leading-none">RT</span>}
                      {r.Source === 'Internet Movie Database' && <span className="text-[10px] font-black text-yellow-400 leading-none">IMDb</span>}
                      {r.Source === 'Metacritic' && <span className="text-[10px] font-black text-green-400 leading-none">MC</span>}
                      <span className="text-xs font-bold text-white/90">{r.Value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body content */}
        <div className="p-4 sm:px-6 flex flex-col gap-6">

          {/* ── Compact/Full rating on first fold ── */}
          <div className="pt-1">
            {editingRating ? FullRatingForm : CompactRatingBar}
          </div>

          {/* Metadata grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm p-3 bg-white/5 rounded-2xl border border-white/10">
            {displayItem.popularity && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> Popularity</span>
                <span className="font-medium text-white/90">{Number(displayItem.popularity).toFixed(0)}</span>
              </div>
            )}
            {(displayItem.budget || displayItem.revenue) && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Box Office</span>
                <span className="font-medium text-white/90">{formatCurrency(displayItem.revenue || displayItem.budget)}</span>
              </div>
            )}
            {airedDateRange && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Timeline</span>
                <span className="font-medium text-white/90">{airedDateRange}</span>
              </div>
            )}
            {(displayItem.number_of_seasons || displayItem.number_of_episodes) && (
              <div className="flex flex-col">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1 flex items-center gap-1"><Clapperboard className="w-3 h-3" /> Layout</span>
                <span className="font-medium text-white/90">
                  {displayItem.number_of_seasons ? displayItem.number_of_seasons + ' Seasons · ' : ''}{displayItem.number_of_episodes} Episodes
                </span>
              </div>
            )}
            {displayItem.production_companies?.length > 0 && (
              <div className="flex flex-col lg:col-span-2">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1">Production</span>
                <span className="font-medium text-white/90 truncate">{displayItem.production_companies.map((p: any) => p.name).join(', ')}</span>
              </div>
            )}
            {displayItem.spoken_languages?.length > 0 && (
              <div className="flex flex-col lg:col-span-2">
                <span className="text-white/50 text-xs uppercase font-bold tracking-wider mb-1">Languages</span>
                <span className="font-medium text-white/90">{displayItem.spoken_languages.map((l: any) => l.english_name).join(', ')}</span>
              </div>
            )}
          </div>

          {/* Overview */}
          <p className="text-sm md:text-base text-white/80 leading-relaxed font-light">{displayItem.overview}</p>

          {/* Crew */}
          {displayItem.crew && (displayItem.crew.director || displayItem.crew.writer || displayItem.crew.producer) && (
            <div className="flex flex-wrap gap-x-8 gap-y-4">
              {displayItem.crew.director && (
                <div><p className="text-white font-bold">{displayItem.crew.director}</p><p className="text-xs text-white/50">Director</p></div>
              )}
              {displayItem.crew.writer && (
                <div><p className="text-white font-bold">{displayItem.crew.writer}</p><p className="text-xs text-white/50">Writer</p></div>
              )}
              {displayItem.crew.producer && (
                <div><p className="text-white font-bold">{displayItem.crew.producer}</p><p className="text-xs text-white/50">Producer</p></div>
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
              <h3 className="text-lg font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Top Cast</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x pr-4">
                {cast.map((actor: any) => (
                  <div key={actor.id} className="w-24 shrink-0 snap-start flex flex-col">
                    {actor.profile_path ? (
                      <img src={actor.profile_path} className="w-full aspect-[2/3] object-cover rounded-xl border border-white/10 mb-2" alt={actor.name} />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-white/5 rounded-xl border border-white/10 mb-2 flex items-center justify-center p-2 text-center text-xs text-white/30">{actor.name}</div>
                    )}
                    <p className="text-xs font-bold leading-tight truncate">{actor.name}</p>
                    <p className="text-[10px] text-white/50 line-clamp-2 leading-tight mt-0.5">{actor.character}</p>
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
                  const detectedType = s.media_type === 'tv' ? 'TV_SHOW' : (item.contentType === 'ANIME' ? 'ANIME' : 'MOVIE');
                  const displayId = s.id || s.mal_id;
                  const simTitle = s.title || s.name || s.title_english || 'Unknown';
                  const href = buildContentUrl(detectedType, simTitle, displayId);
                  return (
                    <Link href={href} key={displayId} className="block group">
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative">
                        {(s.poster_path || s.images?.jpg?.large_image_url) ? (
                          <img
                            src={s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : s.images.jpg.large_image_url}
                            alt={simTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-center p-2 text-xs text-white/50">{simTitle}</div>
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center flex-col p-2 text-center">
                          <PlayCircle className="w-8 h-8 text-white mb-2" />
                          <span className="text-xs font-bold leading-tight">{simTitle}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Sticky CTA bar ─────────────────────────────── */}
      {editingRating && (
        <div className="shrink-0 border-t border-white/10 bg-black/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={submitting} className="hover:bg-white/10 hover:text-white">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!rating || submitting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold min-w-[120px]"
          >
            {submitting
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : isEditing ? 'Update List' : 'Add to List'
            }
          </Button>
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
