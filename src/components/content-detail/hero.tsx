import * as React from 'react';
import { tmdbImageLoader } from '@/lib/tmdb';
import Image from 'next/image';
import TmdbImage from '../ui/tmdb-image';
import Link from 'next/link';
import { Home, Clock } from 'lucide-react';
import type { ContentDetail } from '@/lib/content-detail';
import { WatchProviders } from '../ui/watch-providers';
import { ProfileDropdown } from '../profile-dropdown';

interface HeroProps {
  data: ContentDetail;
}

export function DetailHero({ data }: HeroProps) {
  let airedText = '';
  if (data.firstAirDate) {
    const first = new Date(data.firstAirDate).getFullYear();
    const lastText = data.lastAirDate
      ? new Date(data.lastAirDate).getFullYear().toString()
      : 'Ongoing';
    airedText = `${first} – ${lastText}`;
  }

  return (
    <div className="relative w-full h-[45vh] md:h-[65vh]">
      {data.backdropUrl ? (
        <TmdbImage
          src={data.backdropUrl}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />

      {/* Navigation */}
      <Link
        href="/"
        className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-white/10 backdrop-blur-md rounded-full border border-white/10 transition-all active:scale-95 shadow-xl group"
        title="Go Home"
      >
        <Home className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
      </Link>

      <div className="absolute top-4 right-4 z-50">
        <ProfileDropdown />
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-5 pt-5 pb-0 md:px-10 md:pt-10 md:pb-2 flex gap-6 items-end z-10">
        {data.posterUrl && (
          <div className="hidden md:block relative w-32 md:w-56 aspect-[2/3] shrink-0 rounded-2xl md:rounded-3xl shadow-2xl border border-white/5 overflow-hidden">
            <TmdbImage
              src={data.posterUrl}
              alt={data.title}
              fill
              priority
              className="object-cover"
              sizes="(max-width: 768px) 128px, 224px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-2 mb-1">
            {data.ageCertification && (
              <span className="px-2 py-0.5 text-xs font-bold border border-red-500 text-red-400 rounded-md">
                {data.ageCertification}
              </span>
            )}
            <span className="px-2 py-0.5 text-xs font-semibold border border-white/20 text-white/60 rounded-md uppercase tracking-wider">
              {data.contentType.replace('_', ' ')}
            </span>
            {data.status && (
              <span className="px-2 py-0.5 text-xs font-semibold border border-green-500/30 text-green-400 rounded-md">
                {data.status}
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight drop-shadow-2xl">
            {data.title}{' '}
            {data.year && (
              <span className="text-white/40 font-light ml-2 md:ml-3">({data.year})</span>
            )}
          </h1>

          {data.tagline && (
            <p className="text-white/60 text-sm md:text-base mt-1 font-light italic">
              "{data.tagline}"
            </p>
          )}

          {/* Metadata chips */}
          <div className="flex items-center overflow-x-auto gap-3 mt-2 pb-1 no-scrollbar pr-4 select-none">
            {airedText && (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold whitespace-nowrap shadow-sm lowercase">
                {airedText}
              </span>
            )}
            {(data.runtimeMins || data.episodeRuntime) && (
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5 shadow-sm">
                <Clock className="w-3 h-3 opacity-60" /> {data.runtimeMins || data.episodeRuntime}m
                {data.contentType !== 'MOVIE' ? '/ep' : ''}
              </span>
            )}
            {data.genres.map((g) => (
              <span
                key={g.id}
                className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 text-[11px] font-bold whitespace-nowrap shadow-sm"
              >
                {g.name}
              </span>
            ))}
          </div>

          {data.watchProviders && (
            <WatchProviders
              providers={data.watchProviders}
              title={data.title}
              className="mt-2 md:mt-3 pt-4 md:pt-3 border-t border-white/10"
            />
          )}
        </div>
      </div>
    </div>
  );
}
