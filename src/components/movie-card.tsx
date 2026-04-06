'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star, Tv, Film, Swords, Clock, X, Pencil, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  tmdbId?: number;
  malId?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onViewDetails?: () => void;
  onStreamClick?: () => void;
}

const CONTENT_ICONS: Record<ContentType, React.ReactNode> = {
  MOVIE: <Film className="w-3 h-3" />,
  TV_SHOW: <Tv className="w-3 h-3" />,
  ANIME: <Swords className="w-3 h-3" />,
};

function ratingBg(r: number): string {
  if (r <= 3) return '#991b1b';
  if (r <= 5) return '#9a3412';
  if (r <= 7) return '#713f12';
  if (r <= 9) return '#166534';
  return '#14532d';
}

function parseJson<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === 'string') {
    try { return JSON.parse(val) as T; } catch { return fallback; }
  }
  return fallback;
}

export function MovieCard({
  title, year, posterUrl, userRating, tmdbRating,
  contentType, watchStatus, notes, adult, ageCertification, languages,
  episodeRuntime, runtimeMins, tmdbId, malId, onEdit, onDelete, onViewDetails,
  onStreamClick,
}: MovieCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);

  const langs = parseJson<string[]>(languages, []);
  const runtime = episodeRuntime ?? runtimeMins;
  const runtimeLabel = runtime ? `${runtime}m${contentType !== 'MOVIE' ? '/ep' : ''}` : null;
  const certLabel = ageCertification ?? (adult ? '18+' : null);

  const handleCardClick = () => {
    const pageId = tmdbId ?? malId;
    if (pageId) {
      const url = buildContentUrl(contentType, title, pageId);
      router.push(url);
    } else {
      onViewDetails?.();
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative z-0 hover:z-20"
    >
      <div
        className="relative bg-card rounded-xl overflow-hidden border border-border shadow-sm h-full cursor-pointer group"
        onClick={handleCardClick}
      >
        {/* ── Poster Area ── */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {posterUrl ? (
            <img src={posterUrl} alt={title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs px-2 text-center">{title}</div>
          )}

          {/* Top-Left: Delete Action */}
          {onDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500/20 group/del transition-colors z-30"
              title="Remove from list"
            >
              <Trash2 className="w-4 h-4 text-white/60 group-hover/del:text-red-500 transition-colors" />
            </button>
          )}

          {/* Top-Right: Clickable User Rating (Triggers Edit) */}
          <div className="absolute top-2 right-2 flex items-center gap-2 z-30">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
              className={cn(
                "w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center gap-0.5 shadow-xl transition-all hover:bg-white/10 hover:scale-105 active:scale-95",
              )}
              title="Click to edit rating & details"
            >
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span 
                className={cn(
                  "text-[12px] font-black leading-none",
                  userRating >= 7 ? "text-green-500" :
                  userRating <= 4 ? "text-red-500" :
                  "text-orange-500"
                )}
              >
                {userRating}
              </span>
            </button>
          </div>

          {/* Bottom badges */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-6 flex gap-1 flex-wrap items-end">
            {certLabel && (
              <Badge variant="destructive" className="h-4 text-[9px] px-1 font-bold rounded-sm border-0">{certLabel}</Badge>
            )}
            {runtimeLabel && (
              <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-black/60 text-white/90 font-medium rounded-sm border border-white/20">
                <Clock className="w-2.5 h-2.5 mr-0.5 inline-block" />{runtimeLabel}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Info Area ── */}
        <div className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight line-clamp-1">{title}</p>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground font-medium">
                {year && <span>{year}</span>}
                <span className="opacity-60">{CONTENT_ICONS[contentType]}</span>
              </div>
            </div>

            {onStreamClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onStreamClick(); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0"
              >
                <Tv className="w-3 h-3" />
                Watch
              </button>
            )}
          </div>

          <div className="flex items-center justify-between mt-2.5 h-4">
            {isHovered && notes ? (
              <p className="text-[10px] text-muted-foreground italic line-clamp-1 opacity-60">
                "{notes}"
              </p>
            ) : <div />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
