'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Tv, Film, Swords, Clock, X, Pencil, ExternalLink } from 'lucide-react';
import { Badge } from './ui/badge';
import { buildContentUrl } from '@/lib/slug';
import type { ContentType } from '@prisma/client';

export interface MovieCardProps {
  id: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  tagline?: string | null;
  genres?: unknown;
  userRating: number;
  tmdbRating: number | null;
  contentType: ContentType;
  watchStatus?: string | null;
  notes?: string | null;
  adult?: boolean | null;
  ageCertification?: string | null;
  revenue?: number | null;
  languages?: unknown;
  seasons?: number | null;
  episodes?: number | null;
  networks?: unknown;
  episodeRuntime?: number | null;
  runtimeMins?: number | null;
  omdbRatings?: { Source: string; Value: string }[];
  imdbRating?: string | null;
  // for full-page navigation
  tmdbId?: number;
  malId?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

const CONTENT_ICONS: Record<ContentType, React.ReactNode> = {
  MOVIE: <Film className="w-3 h-3" />,
  TV_SHOW: <Tv className="w-3 h-3" />,
  ANIME: <Swords className="w-3 h-3" />,
};

const STATUS_COLORS: Record<string, string> = {
  WATCHING: 'text-blue-400',
  PLAN_TO_WATCH: 'text-purple-400',
  COMPLETED: 'text-green-400',
  DROPPED: 'text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  WATCHING: 'Watching',
  PLAN_TO_WATCH: 'Plan To Watch',
  COMPLETED: 'Completed',
  DROPPED: 'Dropped',
};

/**
 * Returns a dark background + white text combo that reads well.
 * We desaturate slightly so white text is always legible.
 */
function ratingBg(r: number): string {
  if (r <= 3) return '#991b1b';  // red-800
  if (r <= 5) return '#9a3412';  // orange-800
  if (r <= 7) return '#713f12';  // yellow-900
  if (r <= 9) return '#166534';  // green-800
  return '#14532d';               // green-900
}

function formatRevenue(val: number | null | undefined) {
  if (!val || val === 0) return null;
  if (val >= 1_000_000_000) return '$' + (val / 1_000_000_000).toFixed(1) + 'B';
  if (val >= 1_000_000) return '$' + (val / 1_000_000).toFixed(1) + 'M';
  return '$' + val.toLocaleString();
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

function RTIcon() { return <span className="text-[9px] font-black text-red-500 leading-none">RT</span>; }
function IMDbIcon() { return <span className="text-[9px] font-black text-yellow-400 leading-none">IMDb</span>; }

export function MovieCard({
  title, year, posterUrl, backdropUrl, tagline, genres, userRating, tmdbRating,
  contentType, watchStatus, notes, adult, ageCertification, revenue, languages,
  seasons, episodes, networks, episodeRuntime, runtimeMins, omdbRatings, imdbRating,
  tmdbId, malId, onEdit, onDelete,
}: MovieCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const langs = parseJson<string[]>(languages, []);
  const netws = parseJson<{ id: number; name: string }[]>(networks, []);
  const genreList = parseJson<{ id: number; name: string }[]>(genres, []);

  const rtRating = omdbRatings?.find((r) => r.Source === 'Rotten Tomatoes')?.Value;
  const metaRating = omdbRatings?.find((r) => r.Source === 'Metacritic')?.Value?.split('/')[0];

  const runtime = episodeRuntime ?? runtimeMins;
  const runtimeLabel = runtime ? `${runtime}m${contentType !== 'MOVIE' ? '/ep' : ''}` : null;
  const certLabel = ageCertification ?? (adult ? '18+' : null);
  const isSerial = contentType === 'TV_SHOW' || contentType === 'ANIME';

  // Build full-page URL
  const pageId = tmdbId ?? malId;
  const fullPageUrl = pageId ? buildContentUrl(contentType, title, pageId) : null;

  return (
    <motion.div
      layout
      className="relative"
      style={{ gridColumnEnd: isHovered ? 'span 2' : 'span 1', zIndex: isHovered ? 20 : 0 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <div
        className="relative bg-card rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-colors shadow-sm h-full cursor-pointer"
        onClick={onEdit}
      >
        <div className={`flex ${isHovered ? 'flex-row h-full' : 'flex-col'}`}>

          {/* ── Poster ── */}
          <div className={`relative shrink-0 ${isHovered ? 'w-36 sm:w-44' : 'w-full aspect-[2/3]'}`}>
            {posterUrl ? (
              <img src={posterUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs px-2 text-center">{title}</div>
            )}

            {/* Rating badge — dark bg for contrast, full X/10 format */}
            <div
              className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-lg z-10"
              style={{ backgroundColor: ratingBg(userRating) }}
            >
              <span className="text-[11px] font-black text-white leading-none">{userRating}</span>
              <span className="text-[9px] text-white/60 leading-none font-semibold">/10</span>
            </div>

            {/* Edit overlay on hover — communicates that clicking opens edit */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none"
                >
                  <div className="flex flex-col items-center gap-1.5 text-white">
                    <Pencil className="w-5 h-5 drop-shadow-lg" />
                    <span className="text-[10px] font-semibold bg-black/50 px-2 py-0.5 rounded-full">Edit</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remove — X button top-left, only on hover */}
            <AnimatePresence>
              {isHovered && onDelete && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="absolute top-2 left-2 bg-black/60 hover:bg-red-600 text-white/80 hover:text-white w-6 h-6 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-20"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Cert / runtime / lang badges — always on poster bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-6 flex gap-1 flex-wrap items-end">
              {certLabel && (
                <Badge variant="destructive" className="h-4 text-[9px] px-1 font-bold rounded-sm border-0">{certLabel}</Badge>
              )}
              {runtimeLabel && (
                <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-black/60 text-white/90 font-medium rounded-sm border border-white/20">
                  <Clock className="w-2.5 h-2.5 mr-0.5 inline-block" />{runtimeLabel}
                </Badge>
              )}
              {langs.slice(0, 2).map((l) => (
                <Badge key={String(l)} variant="outline" className="h-4 text-[9px] px-1 bg-black/40 text-white/80 border-white/20 rounded-sm">
                  {String(l).substring(0, 3).toUpperCase()}
                </Badge>
              ))}
            </div>
          </div>

          {/* ── Info column ── */}
          <div className={`flex flex-col p-3 ${isHovered ? 'flex-1 min-w-0 overflow-hidden' : ''}`}>
            <p className="font-semibold text-sm leading-tight line-clamp-2">{title}</p>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {year && <span>{year}</span>}
                <span>{CONTENT_ICONS[contentType]}</span>
              </div>
              {tmdbRating != null && tmdbRating > 0 && (
                <span className="text-[10px] text-yellow-400 flex items-center gap-0.5 font-bold">
                  <Star className="w-2.5 h-2.5 fill-yellow-400" />
                  {Number(tmdbRating).toFixed(1)}
                </span>
              )}
            </div>

            {/* Tier 1: 1-line note when not expanded */}
            {notes && !isHovered && (
              <p className="text-[10px] text-muted-foreground italic line-clamp-1 mt-1">"{notes}"</p>
            )}

            {/* Tier 2: extra info visible only when expanded horizontally */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  key="expanded-info"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="mt-2 flex flex-col gap-2 overflow-hidden flex-1"
                >
                  {/* Backdrop mini */}
                  {backdropUrl && (
                    <div className="w-full h-14 rounded-lg overflow-hidden relative border border-border/50">
                      <img src={backdropUrl} alt="" className="w-full h-full object-cover opacity-70" />
                      <div className="absolute inset-0 bg-gradient-to-r from-card/80 to-transparent" />
                    </div>
                  )}

                  {tagline && (
                    <p className="text-[10px] text-muted-foreground italic line-clamp-2 border-l-2 border-primary/40 pl-2">{tagline}</p>
                  )}

                  {genreList.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {genreList.slice(0, 4).map((g) => (
                        <span key={g.id} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20">{g.name}</span>
                      ))}
                    </div>
                  )}

                  {watchStatus && (
                    <span className={`text-[10px] font-bold ${STATUS_COLORS[watchStatus] ?? ''}`}>
                      {STATUS_LABELS[watchStatus] ?? watchStatus}
                    </span>
                  )}

                  {notes && (
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed line-clamp-3">"{notes}"</p>
                  )}

                  {isSerial ? (
                    <>
                      {episodes != null && episodes > 0 && (
                        <p className="text-[10px] text-muted-foreground">{seasons ? `${seasons}S · ` : ''}{episodes} Eps</p>
                      )}
                      {netws.length > 0 && <p className="text-[10px] text-primary/70 truncate">{netws[0].name}</p>}
                    </>
                  ) : (
                    revenue != null && revenue > 0 && (
                      <p className="text-[10px] text-green-400/90 font-medium">Box Office: {formatRevenue(revenue)}</p>
                    )
                  )}

                  {(rtRating || imdbRating || metaRating) && (
                    <div className="flex items-center gap-3 pt-1 border-t border-border/50">
                      {rtRating && <span className="flex items-center gap-0.5"><RTIcon /><span className="text-[10px] font-semibold">{rtRating}</span></span>}
                      {imdbRating && imdbRating !== 'N/A' && <span className="flex items-center gap-0.5"><IMDbIcon /><span className="text-[10px] font-semibold">{imdbRating}</span></span>}
                      {metaRating && <span className="flex items-center gap-0.5"><span className="text-[9px] font-black text-green-400">MC</span><span className="text-[10px] font-semibold">{metaRating}</span></span>}
                    </div>
                  )}

                  {/* Full page link */}
                  {fullPageUrl && (
                    <Link
                      href={fullPageUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-auto flex items-center gap-1 text-[10px] text-primary/70 hover:text-primary transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> View full page
                    </Link>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
