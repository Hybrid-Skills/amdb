import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { getProviderSearchUrl, uniqueProviders } from '@/lib/utils/watch';
import { cn } from '@/lib/utils';

interface WatchProvidersProps {
  providers: {
    flatrate?: any[];
    rent?: any[];
    buy?: any[];
    link?: string;
  } | null;
  title: string;
  className?: string;
}

export function WatchProviders({ providers, title, className }: WatchProvidersProps) {
  if (!providers) return null;

  const hasFlatrate = providers.flatrate && providers.flatrate.length > 0;
  const hasRentBuy = (providers.rent && providers.rent.length > 0) || (providers.buy && providers.buy.length > 0);

  if (!hasFlatrate && !hasRentBuy) {
    return (
      <div className={cn("p-4 bg-white/5 border border-white/10 rounded-2xl", className)}>
        <p className="text-xs text-white/30 italic">No streaming options found in your region.</p>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center overflow-x-auto no-scrollbar gap-4 flex-nowrap py-0 select-none", className)}>
      <div className="flex items-center gap-2.5 flex-nowrap">
        {!hasFlatrate && hasRentBuy && (
          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 whitespace-nowrap shrink-0">Rent/Buy</span>
        )}

          {hasFlatrate && uniqueProviders(providers.flatrate).slice(0, 10).map((p) => {
          const searchUrl = getProviderSearchUrl(p.provider_name, title, providers.link!);
          return (
            <a
              key={p.provider_id}
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-all hover:scale-110 active:scale-95 shadow-lg group relative shrink-0"
              title={`Watch on ${p.provider_name}`}
            >
              <img 
                src={p.logo_path.startsWith('http') ? p.logo_path : `https://image.tmdb.org/t/p/original${p.logo_path}`} 
                alt={p.provider_name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </a>
          );
        })}

        {hasFlatrate && hasRentBuy && (
          <div className="w-px h-3 bg-white/10 shrink-0 mx-1" />
        )}

        {hasRentBuy && uniqueProviders([...(providers.rent || []), ...(providers.buy || [])]).slice(0, 8).map((p) => {
          const searchUrl = getProviderSearchUrl(p.provider_name, title, providers.link!);
          return (
            <a
              key={p.provider_id}
              href={searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 hover:border-primary/50 transition-all hover:scale-110 active:scale-95 shadow-lg grayscale hover:grayscale-0 opacity-60 hover:opacity-100 group relative shrink-0"
              title={`Rent/Buy on ${p.provider_name}`}
            >
              <img 
                src={p.logo_path.startsWith('http') ? p.logo_path : `https://image.tmdb.org/t/p/original${p.logo_path}`} 
                alt={p.provider_name} 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </a>
          );
        })}
      </div>

      <div className="shrink-0 flex items-center pl-2">
        <a 
          href={providers.link} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex flex-col items-start text-[8px] leading-tight text-white/30 hover:text-white transition-opacity font-medium uppercase tracking-tighter"
        >
          <span className="flex items-center gap-0.5">
            via <ArrowUpRight className="w-3 h-3 text-white/30" />
          </span>
          <span className="font-bold">JustWatch</span>
        </a>
      </div>
    </div>
  );
}
