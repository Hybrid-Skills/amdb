'use client';

import * as React from 'react';
import { X, PlayCircle } from 'lucide-react';
import Image from 'next/image';

interface video {
  key: string;
  name: string;
  type: string;
  site: string;
  official: boolean;
}

interface VideosSectionProps {
  videos: video[];
}

export function VideosSection({ videos }: VideosSectionProps) {
  const [activeVideoKey, setActiveVideoKey] = React.useState<string | null>(null);

  if (!videos?.length) return null;

  const trailer = videos.find((v) => v.type === 'Trailer' && v.site === 'YouTube');
  const otherVideos = videos.filter((v) => v !== trailer).slice(0, 5);

  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight mb-3 md:mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        Videos
      </h2>
      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-6 -mx-4 px-4 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Trailer */}
        {trailer && (
          <div className="flex-shrink-0 w-[85vw] md:w-[600px] snap-center flex flex-col gap-2">
            <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-lg relative bg-black">
              <div className="absolute top-3 left-3 z-10 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded shadow-md pointer-events-none">
                Official Trailer
              </div>
              <iframe
                src={`https://www.youtube.com/embed/${trailer.key}?modestbranding=1&rel=0`}
                className="w-full h-full relative z-0"
                allowFullScreen
                title={trailer.name}
              />
            </div>
            <p className="text-xs text-white/40 mt-1 ml-1 hidden md:block">
              Swipe right for more videos →
            </p>
          </div>
        )}

        {/* Other Videos */}
        {otherVideos.map((v) => (
          <button
            key={v.key}
            onClick={() => setActiveVideoKey(v.key)}
            className="flex flex-col gap-2 p-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors group snap-start shrink-0 w-[65vw] md:w-[320px] text-left"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-zinc-900 shadow-lg">
              <Image
                src={`https://img.youtube.com/vi/${v.key}/maxresdefault.jpg`}
                alt={v.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 350px"
              />
              <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
              <div className="absolute inset-0 flex items-center justify-center opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all">
                <PlayCircle className="w-12 h-12 text-white shadow-xl" />
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <p className="text-sm font-semibold group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                {v.name}
              </p>
              <p className="text-[11px] font-bold tracking-widest uppercase text-white/40 mt-1.5">
                {v.type}
              </p>
            </div>
          </button>
        ))}
        <div className="w-4 shrink-0" />
      </div>

      {/* Video Modal */}
      {activeVideoKey && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setActiveVideoKey(null)}
        >
          <div
            className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${activeVideoKey}?modestbranding=1&rel=0&autoplay=1`}
              className="w-full h-full relative z-0"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title="Video Player"
            />
          </div>
          <button
            className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/10 hover:bg-white/20 p-3 rounded-full transition-colors z-[110]"
            onClick={() => setActiveVideoKey(null)}
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </section>
  );
}
