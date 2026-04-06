'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Star, Tv, Film, Clock, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { buildContentUrl } from '@/lib/slug';
import { tmdbImageLoader } from '@/lib/tmdb';
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

function parseJson<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as T;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function MovieCard({
  id,
  title,
  year,
  posterUrl,
  userRating,
  contentType,
  notes,
  adult,
  ageCertification,
  languages,
  episodeRuntime,
  runtimeMins,
  onEdit,
  onDelete,
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
            <Image
              loader={tmdbImageLoader}
              src={posterUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs px-2 text-center">
              {title}
            </div>
          )}

          {/* Top-Left: Delete Action */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500/20 group/del transition-colors z-30"
              title="Remove from list"
            >
              <Trash2 className="w-4 h-4 text-white/60 group-hover/del:text-red-500 transition-colors" />
            </button>
          )}

          {/* Top-Right: Clickable Actions */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-30">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="w-8 h-8 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg"
                title="Edit entry"
              >
                <Pencil className="w-3.5 h-3.5 text-white/60" />
              </button>
            )}

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
          </div>

          {/* Bottom badges */}
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
        </div>

        {/* ── Info Area ── */}
        <div className="p-3 flex flex-col gap-1.5">
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

          {isHovered && notes && (
            <p className="text-[10px] text-muted-foreground italic line-clamp-1 opacity-60">
              "{notes}"
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
