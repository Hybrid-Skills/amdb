import * as React from 'react';
import Link from 'next/link';
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
  const items = contentType === 'MOVIE'
    ? await fetchMovieSimilar(tmdbId)
    : await fetchTvSimilar(tmdbId);

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
          return (
            <Link key={s.id} href={href} className="group flex flex-col">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-white/5 border border-white/10 relative mb-1.5">
                {s.poster_path ? (
                  <img src={s.poster_path} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-center text-[10px] text-white/30 p-2">{s.title}</div>
                )}
              </div>
              <p className="text-xs font-semibold line-clamp-2 leading-tight group-hover:text-primary transition-colors">{s.title}</p>
              {s.vote_average > 0 && <p className="text-[10px] text-yellow-400 mt-0.5 font-bold">★ {s.vote_average.toFixed(1)}</p>}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
