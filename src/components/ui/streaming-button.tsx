'use client';

import * as React from 'react';
import { Tv, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { WatchProviders } from './watch-providers';
import type { ContentType } from '@prisma/client';

interface StreamingButtonProps {
  tmdbId?: number | null;
  contentType: ContentType | string;
  title: string;
}

export function StreamingButton({ tmdbId, contentType, title }: StreamingButtonProps) {
  const [open, setOpen] = React.useState(false);
  const [providers, setProviders] = React.useState<any>(undefined); // undefined = not fetched yet, null = fetched but empty
  const [loading, setLoading] = React.useState(false);

  if (!tmdbId) return null;

  async function load() {
    if (providers !== undefined) return; // already fetched
    setLoading(true);
    try {
      const type = contentType === 'MOVIE' ? 'movie' : 'tv';
      const res = await fetch(`/api/watch-providers?tmdbId=${tmdbId}&type=${type}`);
      const data = await res.json();
      setProviders(data.watchProviders ?? null);
    } catch {
      setProviders(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) load(); }}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md border border-border hover:border-primary/50 transition-colors w-full mt-1"
        >
          <Tv className="w-3 h-3 shrink-0" />
          <span>Streaming</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 bg-popover border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : providers ? (
          <WatchProviders providers={providers} title={title} />
        ) : (
          <p className="text-xs text-muted-foreground text-center py-1">
            Not available in your region.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
