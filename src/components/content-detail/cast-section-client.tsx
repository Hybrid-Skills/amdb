'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import Image from 'next/image';
import { tmdbImageLoader } from '@/lib/tmdb';
import { Button } from '../ui/button';

interface Actor {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

export function CastSectionClient({ cast }: { cast: Actor[] }) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasMoreMobile = cast.length > 9;
  const hasMoreDesktop = cast.length > 16;
  const showCastButtonClass = hasMoreMobile && !hasMoreDesktop ? 'md:hidden' : '';

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-tight mb-3 md:mb-4 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-primary inline-block" />
          Full Cast
        </h2>

        {(hasMoreMobile || hasMoreDesktop) && (
          <div className={showCastButtonClass}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary hover:bg-primary/10 font-bold gap-1"
            >
              {isExpanded ? (
                <>
                  Show less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show full cast <ChevronDown className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {cast.map((actor, i) => {
          const isHidden = !isExpanded && i >= 16;
          const isHiddenOnMobile = !isExpanded && i >= 9 && i < 16;

          if (isHidden) return null;

          return (
            <div
              key={`${actor.id}-${i}`}
              className={`flex-col group ${isHiddenOnMobile ? 'hidden md:flex' : 'flex'}`}
            >
              <div className="relative w-full aspect-[2/3] rounded-xl overflow-hidden border border-white/10 mb-2">
                {actor.profile_path ? (
                  <Image
                    loader={tmdbImageLoader}
                    src={actor.profile_path}
                    alt={actor.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="128px"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center p-2 text-center text-xs text-white/30">
                    <User className="w-8 h-8 opacity-20" />
                  </div>
                )}
              </div>
              <p className="text-xs font-semibold leading-tight line-clamp-1">{actor.name}</p>
              <p className="text-[10px] text-white/40 line-clamp-1 leading-tight mt-0.5">
                {actor.character}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
