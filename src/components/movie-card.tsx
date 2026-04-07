'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Star, Tv, Film, Clock, Pencil, Trash2, Bookmark, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { buildContentUrl } from '@/lib/slug';
import { tmdbImageLoader } from '@/lib/tmdb';
import TmdbImage from './ui/tmdb-image';
import type { ContentType } from '@prisma/client';

export interface MovieCardProps {
  id: string;
  title: string;
  year: number | null;
  posterUrl: string | null;
  backdropUrl?: string | null;
  tagline?: string | null;
  genres?: unknown;
  userRating?: number | null;
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
  
  // Tab variants
  variant?: 'WATCHED' | 'PLANNED' | 'RECOMMENDED';
  
  // Actions
  onEdit?: () => void;
  onDelete?: () => void;
  onSecondaryAction?: () => void; // Bookmark for REC, Rate for PLANNED/REC
  isSecondaryLoading?: boolean;
  onViewDetails?: () => void;
}

const CONTENT_ICONS: Record<ContentType, React.ReactNode> = {
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

export function MovieCard({
  id,
  title,
  year,
  posterUrl,
  userRating,
  tmdbRating,
  contentType,
  notes,
  adult,
  ageCertification,
  episodeRuntime,
  runtimeMins,
  variant = 'WATCHED',
  onEdit,
  onDelete,
  onSecondaryAction,
  isSecondaryLoading,
}: MovieCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);

  const runtime = episodeRuntime ?? runtimeMins;
  const runtimeLabel = runtime ? `${runtime}m${contentType !== 'MOVIE' ? '/ep' : ''}` : null;
  const certLabel = ageCertification ?? (adult ? '18+' : null);

  const handleCardClick = () => {
    const url = buildContentUrl(contentType, title, id);
    router.push(url);
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative z-0 hover:z-20"
    >
      <div
        className="relative bg-card rounded-xl overflow-hidden border border-border shadow-sm h-full cursor-pointer group flex flex-col"
        onClick={handleCardClick}
      >
        {/* ── Poster Area ── */}
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          {posterUrl ? (
            <TmdbImage
              src={posterUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 250px"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
              {title}
            </div>
          )}

          {/* Top-Left: Delete Action (Always available if onDelete provided) */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500/20 group/del transition-all z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100"
              title="Remove"
            >
              <Trash2 className="w-4 h-4 text-white/60 group-hover/del:text-red-500 transition-colors" />
            </button>
          )}

          {/* Top-Right: Variant Specific Actions */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
            {variant === 'WATCHED' && userRating != null && (
              <div className="h-8 px-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center gap-1.5 shadow-xl transition-all select-none">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span
                  className={cn(
                    'text-[12px] font-black leading-none',
                    userRating >= 7
                      ? 'text-green-500'
                      : userRating <= 4
                        ? 'text-red-500'
                        : 'text-orange-500',
                  )}
                >
                  {userRating}
                </span>
              </div>
            )}

            {variant === 'RECOMMENDED' && onSecondaryAction && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSecondaryAction();
                }}
                disabled={isSecondaryLoading}
                className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all shadow-lg opacity-100 md:opacity-0 md:group-hover:opacity-100"
                title="Add to Planned"
              >
                {isSecondaryLoading ? (
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                ) : (
                  <Bookmark className="w-3.5 h-3.5 text-white/60" />
                )}
              </button>
            )}
          </div>

          {/* Bottom badges (Left-aligned info) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-6 flex gap-1 flex-wrap items-end overflow-hidden">
            <Badge
              variant="secondary"
              className="h-4 w-4 p-0 flex items-center justify-center bg-black/60 text-white/90 font-bold rounded-sm border border-white/20 transition-transform active:scale-95 translate-y-[0.5px]"
              title={contentType.replace('_', ' ')}
            >
              {CONTENT_ICONS[contentType]}
            </Badge>
            {certLabel && (
              <Badge
                variant="destructive"
                className="h-4 text-[9px] px-1 font-bold rounded-sm border-0"
              >
                {certLabel}
              </Badge>
            )}
            {runtimeLabel && (
              <Badge
                variant="secondary"
                className="h-4 text-[9px] px-1 bg-black/60 text-white/90 font-medium rounded-sm border border-white/20"
              >
                <Clock className="w-2.5 h-2.5 mr-0.5 inline-block" />
                {runtimeLabel}
              </Badge>
            )}
          </div>

          {/* Bottom-Right (Poster): TMDB Rating for non-watched */}
          {variant !== 'WATCHED' && tmdbRating != null && Number(tmdbRating) > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 z-30 shadow-2xl">
              ★ {Number(tmdbRating).toFixed(1)}
            </div>
          )}
        </div>

        {/* ── Info Area ── */}
        <div className="p-3 flex flex-col gap-2.5 flex-1">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-snug line-clamp-2">
              {title}{' '}
              {year && (
                <span className="font-normal text-muted-foreground ml-1 shrink-0 whitespace-nowrap">
                  ({year})
                </span>
              )}
            </p>
          </div>

          {/* Bottom CTA Row (Redesigned) */}
          <div 
            className={cn(
              "mt-auto px-2.5 py-2 rounded-lg flex items-center justify-between transition-all active:scale-[0.98] group/cta",
              variant === 'WATCHED' 
                ? "bg-secondary/40 hover:bg-secondary/60 text-foreground" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
            )}
            onClick={(e) => {
              e.stopPropagation();
              if (variant === 'WATCHED') {
                onEdit?.();
              } else {
                onSecondaryAction?.();
              }
            }}
          >
            {variant === 'WATCHED' ? (
              <>
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-[12px] font-black">
                    {userRating} <span className="font-bold opacity-60 ml-0.5">Rating</span>
                  </span>
                </div>
                <Pencil className="w-3.5 h-3.5 opacity-40 group-hover/cta:opacity-100 transition-opacity" />
              </>
            ) : (
              <>
                <span className="text-[12px] font-black uppercase tracking-tight">Mark Watched</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
