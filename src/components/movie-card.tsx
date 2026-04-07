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
  recommendationReason?: string | null;
  recommendationLabel?: string | null;
  
  // Tab variants
  variant?: 'WATCHED' | 'PLANNED' | 'RECOMMENDED';
  layout?: 'vertical' | 'horizontal';
  
  // Actions
  onEdit?: () => void;
  onDelete?: () => void;
  onSecondaryAction?: () => void; // Bookmark for REC, Rate for PLANNED/REC
  isSecondaryLoading?: boolean;
  onViewDetails?: () => void;
}

const RATING_LABELS: Record<number, string> = {
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
};

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

const LABEL_MAP: Record<string, string> = {
  UNDERRATED: 'Underrated',
  CRITICALLY_ACCLAIMED: 'Critically Acclaimed',
  AWARD_WINNING: 'Award Winning',
  FAN_FAVORITE: 'Fan Favorite',
  CULT_CLASSIC: 'Cult Classic',
  VISUAL_SPECTACLE: 'Visual Spectacle',
  IMMERSIVE_SOUND: 'Immersive Sound',
  TECHNICAL_MASTERY: 'Technical Mastery',
  DIRECTORIAL_DEBUT: 'Directorial Debut',
  GENRE_DEFINING: 'Genre Defining',
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
  layout = 'vertical',
  onEdit,
  onDelete,
  onSecondaryAction,
  isSecondaryLoading,
  recommendationReason,
  recommendationLabel,
  onViewDetails,
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

  const isHorizontal = layout === 'horizontal';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn("relative z-0 hover:z-20 h-full", isHorizontal && "col-span-1 md:col-span-2")}
    >
      <div
        className={cn(
          "relative bg-card rounded-xl overflow-hidden border border-border shadow-sm h-full cursor-pointer group flex",
          isHorizontal ? "flex-row" : "flex-col"
        )}
        onClick={handleCardClick}
      >
        {/* ── Poster/Banner Section ── */}
        <div 
          className={cn(
            "relative overflow-hidden shrink-0",
            isHorizontal ? "w-[120px] sm:w-[150px] aspect-[2/3]" : "aspect-[2/3] w-full"
          )}
        >
          {posterUrl ? (
            <TmdbImage
              src={posterUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 250px"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
              {title}
            </div>
          )}

          {/* Delete Action (Pinned to poster Banner) */}
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

          {/* Bottom badges (Left-aligned info) - Only in vertical for density */}
          {!isHorizontal && (
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
          )}

          {/* TMDB Rating (Pinned to Poster) */}
          {variant !== 'WATCHED' && tmdbRating != null && Number(tmdbRating) > 0 && (
            <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 z-30 shadow-2xl">
              ★ {Number(tmdbRating).toFixed(1)}
            </div>
          )}
        </div>

        {/* ── Info/Content Section ── */}
        <div className="flex flex-col flex-1 min-h-0 bg-card overflow-hidden">
          <div className={cn("flex-1 min-w-0 p-3", isHorizontal && "sm:p-4")}>
            <div className="flex items-center justify-between gap-2 mb-1 flex-wrap sm:flex-nowrap">
              <p className="font-extrabold text-[15px] sm:text-base leading-tight truncate">
                {title}
              </p>
              {year && (
                <span className="font-bold text-muted-foreground text-sm shrink-0">
                  {year}
                </span>
              )}
            </div>

            {/* Recommendation Reason */}
            {recommendationReason && (
              <p className={cn(
                "text-[12px] text-muted-foreground/90 italic leading-snug mt-2",
                isHorizontal ? "line-clamp-4" : "line-clamp-2"
              )}>
                {recommendationReason}
              </p>
            )}

            {/* Horizontal Metatdata (Badges on right) */}
            {isHorizontal && (
               <div className="flex flex-col gap-2 mt-auto">
                 {recommendationLabel && (
                   <div className="inline-flex items-center self-start px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-tight">
                     {LABEL_MAP[recommendationLabel] || recommendationLabel.replace('_', ' ')}
                   </div>
                 )}
                 <div className="flex gap-2.5 items-center opacity-80">
                   <div className="flex items-center gap-1.5 uppercase font-black text-[10px] tracking-widest text-muted-foreground">
                     {CONTENT_ICONS[contentType]}
                     {contentType.replace('_', ' ')}
                   </div>
                   {runtimeLabel && (
                      <div className="text-[10px] font-black text-muted-foreground">
                        {runtimeLabel}
                      </div>
                   )}
                 </div>
               </div>
            )}
          </div>

          {/* Bottom Action Area (Always flush) */}
          {isHorizontal ? (
            <div className="flex items-stretch border-t border-border shrink-0 min-h-[44px]">
               <button 
                 onClick={(e) => { e.stopPropagation(); onSecondaryAction?.(); }}
                 disabled={isSecondaryLoading}
                 className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 bg-secondary/10 hover:bg-secondary/20 text-foreground transition-all border-r border-border hover:text-primary min-w-0"
               >
                 {isSecondaryLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin"/> : <Bookmark className="w-4.5 h-4.5"/>}
                 <span className="text-[10px] font-black uppercase tracking-tight whitespace-nowrap">Add to Planned</span>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }} 
                 className="flex-1 flex items-center justify-center gap-2 px-2 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground transition-all min-w-0"
               >
                 <CheckCircle2 className="w-4.5 h-4.5"/>
                 <span className="text-[10px] font-black uppercase tracking-tight whitespace-nowrap">Mark Watched</span>
               </button>
            </div>
          ) : (
            /* Vertical Unified CTA (Already optimized) */
            <div 
              className={cn(
                "px-3 py-2.5 flex items-center justify-between transition-all active:scale-[0.98] group/cta shrink-0 rounded-b-xl",
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
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Star className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500 shrink-0" />
                    <span className="text-[10px] font-black truncate uppercase tracking-tight whitespace-nowrap">
                      <span className="text-foreground">{userRating}</span>
                      <span className="font-bold opacity-70 ml-1">
                        {RATING_LABELS[Math.round(userRating ?? 0)]}
                      </span>
                    </span>
                  </div>
                  <Pencil className="w-4 h-4 opacity-40 group-hover/cta:opacity-100 transition-opacity shrink-0 ml-2" />
                </>
              ) : (
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-black uppercase tracking-tight whitespace-nowrap">
                    Mark Watched
                  </span>
                  <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
