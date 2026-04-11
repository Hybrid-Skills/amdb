'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Star,
  Tv,
  Film,
  Clock,
  Pencil,
  Trash2,
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Loader2,
  Award,
  Trophy,
  Heart,
  History,
  Eye,
  Waves,
  Cpu,
  Clapperboard,
  Zap,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { buildContentUrl } from '@/lib/slug';
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
  overview?: string | null;
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
  isEnriching?: boolean;
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

const getRatingColor = (r: number): string => {
  if (r <= 3) return '#ef4444';
  if (r <= 5) return '#f97316';
  if (r <= 7) return '#eab308';
  if (r <= 9) return '#84cc16';
  return '#22c55e';
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

const LABEL_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string; bg: string; border: string }
> = {
  UNDERRATED: {
    label: 'Underrated',
    icon: <Search className="w-3 h-3" />,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
  },
  CRITICALLY_ACCLAIMED: {
    label: 'Critically Acclaimed',
    icon: <Award className="w-3 h-3" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  AWARD_WINNING: {
    label: 'Award Winning',
    icon: <Trophy className="w-3 h-3" />,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
  },
  FAN_FAVORITE: {
    label: 'Fan Favorite',
    icon: <Heart className="w-3 h-3" />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
  CULT_CLASSIC: {
    label: 'Cult Classic',
    icon: <History className="w-3 h-3" />,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  VISUAL_SPECTACLE: {
    label: 'Visual Spectacle',
    icon: <Eye className="w-3 h-3" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  IMMERSIVE_SOUND: {
    label: 'Immersive Sound',
    icon: <Waves className="w-3 h-3" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  TECHNICAL_MASTERY: {
    label: 'Technical Mastery',
    icon: <Cpu className="w-3 h-3" />,
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
  },
  DIRECTORIAL_DEBUT: {
    label: 'Directorial Debut',
    icon: <Clapperboard className="w-3 h-3" />,
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
  },
  GENRE_DEFINING: {
    label: 'Genre Defining',
    icon: <Zap className="w-3 h-3" />,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
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
  overview,
  recommendationReason,
  recommendationLabel,
  onViewDetails,
  isEnriching = false,
}: MovieCardProps) {
  const router = useRouter();
  const [isHovered, setIsHovered] = React.useState(false);

  const runtime = episodeRuntime ?? runtimeMins;
  const runtimeLabel = runtime ? `${runtime}m${contentType !== 'MOVIE' ? '/ep' : ''}` : null;
  const certLabel = ageCertification ?? (adult ? '18+' : null);

  const handleCardClick = () => {
    // Persist scroll into the current history entry so back nav restores it
    const existing = window.history.state ?? {};
    window.history.replaceState(
      { ...existing, _amdb: { ...existing._amdb, scroll: window.scrollY } },
      '',
    );
    const url = buildContentUrl(contentType, title, id);
    router.push(url);
  };

  const isHorizontal = layout === 'horizontal';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={cn('relative z-0 hover:z-20 h-full', isHorizontal && 'col-span-1 md:col-span-2')}
    >
      <div
        className={cn(
          'relative bg-card rounded-xl overflow-hidden border border-border shadow-sm h-full cursor-pointer group flex',
          isHorizontal ? 'flex-row' : 'flex-col',
        )}
        onClick={handleCardClick}
      >
        {/* ── Poster/Banner Section ── */}
        <div
          className={cn(
            'relative overflow-hidden shrink-0',
            isHorizontal ? 'w-[120px] sm:w-[150px] aspect-[2/3]' : 'aspect-[2/3] w-full',
          )}
        >
          {isEnriching ? (
            <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-muted-foreground/20 animate-spin" />
            </div>
          ) : posterUrl ? (
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

          {/* Delete Action (Pinned to poster) — hidden for horizontal PLANNED (handled by action bar) */}
          {onDelete && !(isHorizontal && variant === 'PLANNED') && (
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

          {/* Bottom badges (Left-aligned info) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2 pt-6 flex gap-1 flex-wrap items-end overflow-hidden z-20">
            <Badge
              variant="secondary"
              className="h-4 w-4 p-0 flex items-center justify-center bg-black/60 text-white/90 font-bold rounded-sm border border-white/20 transition-transform active:scale-95 translate-y-[0.5px]"
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

          {/* TMDB Rating (Pinned to Top-Right of Poster) */}
          {tmdbRating != null && Number(tmdbRating) > 0 && (
            <div className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-yellow-400 text-[10px] font-bold z-30 shadow-2xl transition-all group-hover:bg-black/80">
              {Number(tmdbRating).toFixed(1)}
            </div>
          )}
        </div>

        {/* ── Info/Content Section ── */}
        <div className="flex flex-col flex-1 min-h-0 bg-card overflow-hidden">
          <div className={cn('flex-1 min-w-0', isHorizontal ? 'p-3 sm:p-4' : 'p-2')}>
            <div
              className={cn(
                'flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap',
                isHorizontal ? 'mb-1' : 'mb-0',
              )}
            >
              <p
                className={cn(
                  'font-extrabold leading-tight line-clamp-2',
                  isHorizontal ? 'text-[15px] sm:text-base' : 'text-[13px]',
                )}
              >
                {title}
                {year && <span className="opacity-70 font-bold ml-1.5 text-[0.9em]">({year})</span>}
              </p>
            </div>

            {/* Correct Metadata Row Position (Between Title and Reason) */}
            {isHorizontal && (
              <div className="flex items-center gap-2.5 my-2 flex-nowrap overflow-hidden">
                {recommendationLabel && LABEL_CONFIG[recommendationLabel] && (
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight shadow-sm whitespace-nowrap shrink-0',
                      LABEL_CONFIG[recommendationLabel].bg,
                      LABEL_CONFIG[recommendationLabel].color,
                      LABEL_CONFIG[recommendationLabel].border,
                    )}
                  >
                    {LABEL_CONFIG[recommendationLabel].icon}
                    {LABEL_CONFIG[recommendationLabel].label}
                  </div>
                )}
                {/* Runtime removed from here - now on poster */}
              </div>
            )}

            {/* Description: recommendation reason or overview */}
            {(recommendationReason || overview) && (
              <p
                className={cn(
                  'text-[12px] text-muted-foreground/90 leading-snug',
                  isHorizontal ? 'line-clamp-5' : 'line-clamp-2',
                  recommendationReason && 'italic',
                )}
              >
                {recommendationReason ?? overview}
              </p>
            )}
          </div>

          {/* Bottom Action Area (Always flush) */}
          {isHorizontal ? (
            isEnriching ? (
              <div className="flex items-center justify-center gap-2 px-2 py-1.5 bg-secondary/5 border-t border-border shrink-0 min-h-[36px] animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                  Fetching details...
                </span>
              </div>
            ) : (
              <div className="flex items-stretch border-t border-border shrink-0 min-h-[36px]">
                {variant === 'PLANNED' ? (
                  <>
                    {/* Left: Planned → triggers removal confirmation */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-emerald-500/10 hover:bg-red-500/15 text-emerald-400 hover:text-red-400 transition-all border-r border-border min-w-0 group/planned"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold uppercase tracking-tight whitespace-nowrap">
                        Planned
                      </span>
                    </button>
                    {/* Right: Rate → opens add-to-list modal */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSecondaryAction?.();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-all min-w-0"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold uppercase tracking-tight whitespace-nowrap">
                        Rate
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* RECOMMENDED: Plan + Rate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSecondaryAction?.();
                      }}
                      disabled={isSecondaryLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-all border-r border-border min-w-0"
                    >
                      {isSecondaryLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                      <span className="text-xs font-semibold uppercase tracking-tight whitespace-nowrap">
                        Plan
                      </span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails?.();
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-2 py-1.5 bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-all min-w-0"
                    >
                      <Star className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold uppercase tracking-tight whitespace-nowrap">
                        Rate
                      </span>
                    </button>
                  </>
                )}
              </div>
            )
          ) : variant === 'WATCHED' ? (
            /* Vertical Watched CTA */
            <div className="px-2 py-1.5 flex items-center justify-between transition-all group/cta shrink-0 rounded-b-xl bg-secondary/40 hover:bg-secondary/60 text-foreground">
              <div className="flex items-center gap-1.5 min-w-0">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                <span className="text-xs font-bold truncate uppercase tracking-tight whitespace-nowrap">
                  <span className="text-foreground">{userRating}</span>
                  <span
                    className="font-bold ml-1.5"
                    style={{ color: getRatingColor(userRating ?? 0) }}
                  >
                    {RATING_LABELS[Math.round(userRating ?? 0)]}
                  </span>
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.();
                }}
                className="p-1 hover:bg-black/10 rounded-md transition-colors"
              >
                <Pencil className="w-4 h-4 opacity-40 group-hover/cta:opacity-100 transition-opacity shrink-0" />
              </button>
            </div>
          ) : variant === 'PLANNED' ? (
            /* Vertical Planned CTA */
            <div className="flex items-stretch border-t border-border shrink-0 min-h-[34px] rounded-b-xl overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); onSecondaryAction?.(); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-secondary/40 hover:bg-secondary/60 text-white/60 hover:text-white transition-all text-xs font-bold uppercase tracking-tight"
              >
                <Star className="w-3 h-3" />
                Rate
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
