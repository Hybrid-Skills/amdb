'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getProviderSearchUrl, uniqueProviders } from '@/lib/utils/watch';
import { Badge } from './ui/badge';

interface WatchProvidersModalProps {
  item: {
    title: string;
    year?: number | null;
    watchProviders?: {
      link: string;
      flatrate?: any[];
      rent?: any[];
      buy?: any[];
    } | null;
  } | null;
  onClose: () => void;
}

export function WatchProvidersModal({ item, onClose }: WatchProvidersModalProps) {
  if (!item) return null;

  const providers = item.watchProviders;
  const hasProviders = providers && (
    (providers.flatrate && providers.flatrate.length > 0) ||
    (providers.rent && providers.rent.length > 0) ||
    (providers.buy && providers.buy.length > 0)
  );

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-zinc-950 border-zinc-800 text-white rounded-3xl p-0 overflow-hidden outline-none">
        <div className="p-6 pb-4">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black flex items-baseline gap-2">
              {item.title}
              {item.year && <span className="text-base font-normal text-white/40">({item.year})</span>}
            </DialogTitle>
            <p className="text-xs text-white/40 font-medium uppercase tracking-widest mt-1">Available Watch Options</p>
          </DialogHeader>
        </div>

        <div className="px-6 pb-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {!hasProviders ? (
            <div className="py-12 text-center">
              <p className="text-white/40 text-sm">No streaming information available for your region.</p>
              {providers?.link && (
                <a 
                  href={providers.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-4 inline-block text-primary text-sm font-bold hover:underline"
                >
                  Check full details on JustWatch ↗
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Streaming Section */}
              {providers.flatrate && providers.flatrate.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-green-500 rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Stream Free / Sub</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {uniqueProviders(providers.flatrate).map((p) => {
                      const searchUrl = getProviderSearchUrl(p.provider_name, item.title, providers.link);
                      return (
                        <ProviderLink key={p.provider_id} provider={p} href={searchUrl} />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Rent/Buy Section */}
              {((providers.rent && providers.rent.length > 0) || (providers.buy && providers.buy.length > 0)) && (
                <section>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-white/60">Rent or Buy</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {uniqueProviders([...(providers.rent ?? []), ...(providers.buy ?? [])]).map((p) => {
                      const searchUrl = getProviderSearchUrl(p.provider_name, item.title, providers.link);
                      return (
                        <ProviderLink key={p.provider_id} provider={p} href={searchUrl} />
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Attribution */}
              <div className="pt-4 border-t border-white/5 flex justify-center">
                <a 
                  href={providers.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[10px] text-white/20 hover:text-white transition-colors font-bold uppercase tracking-widest"
                >
                  via JustWatch ↗
                </a>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProviderLink({ provider, href }: { provider: any; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group active:scale-95"
    >
      <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/5 group-hover:scale-105 transition-transform">
        <img src={provider.logo_path} alt={provider.provider_name} className="w-full h-full object-cover" />
      </div>
      <span className="text-sm font-bold text-white/80 group-hover:text-white truncate">{provider.provider_name}</span>
    </a>
  );
}
