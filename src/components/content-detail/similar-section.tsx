import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TmdbImage from '../ui/tmdb-image';
import { PlayCircle } from 'lucide-react';
import { buildContentUrl } from '@/lib/slug';
import { fetchMovieSimilar, fetchTvSimilar } from '@/lib/content-detail';

interface SimilarItem {
  id: number;
  title: string;
  poster_path: string | null;
  vote_average: number;
}

interface SimilarSectionProps {
  tmdbId: number;
  contentType: 'MOVIE' | 'TV_SHOW' | 'ANIME';
}

export async function SimilarSection({ tmdbId, contentType }: SimilarSectionProps) {
  const items =
    contentType === 'MOVIE' ? await fetchMovieSimilar(tmdbId) : await fetchTvSimilar(tmdbId);

  if (!items?.length) return null;

  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight mb-3 md:mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        Similar Titles
      </h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {items.map((s: SimilarItem) => {
          const href = buildContentUrl(contentType, s.title, String(s.id));
          const simTitle = s.title;
          return (
            <Link key={s.id} href={href} className="group flex flex-col">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative mb-1.5">
                {s.poster_path ? (
                  <TmdbImage
                    src={s.poster_path}
                    alt={simTitle}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 33vw, 150px"
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
              <p className="text-xs font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {s.title}
              </p>
              {s.vote_average > 0 && (
                <p className="text-[10px] text-yellow-400 mt-0.5 font-bold">
                  ★ {s.vote_average.toFixed(1)}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
