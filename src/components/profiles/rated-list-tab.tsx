'use client';

import * as React from 'react';
import Link from 'next/link';
import { Star, ArrowRight } from 'lucide-react';

interface RatedItem {
  id: string;
  title: string;
  year: number | null;
  rating: number;
}

interface RatedListTabProps {
  items: RatedItem[];
  profileName: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export function RatedListTab({ 
  items, 
  profileName, 
  hasMore, 
  loadingMore, 
  onLoadMore 
}: RatedListTabProps) {
  if (items.length === 0) {
    return (
      <div className="py-20 text-center space-y-3">
        <div className="inline-flex p-4 rounded-full bg-white/5 text-white/20">
          <Star className="w-8 h-8" />
        </div>
        <p className="text-white/40 font-medium">No rated titles found</p>
      </div>
    );
  }

  // Get first name for the header
  const firstName = profileName.split(' ')[0];

  return (
    <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 sm:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                Title (Year)
              </th>
              <th className="px-4 sm:px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">
                {firstName}&apos;s Rating
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {items.map((item) => (
              <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-4 sm:px-6 py-4">
                  <Link
                    href={`/content/${item.id}`}
                    className="flex flex-col gap-0.5 group-hover:translate-x-1 transition-transform"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white leading-tight">
                        {item.title}
                      </span>
                      <ArrowRight className="w-3 h-3 text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {item.year && (
                      <span className="text-[10px] sm:text-xs text-white/30 font-medium tracking-wide">
                        {item.year}
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 sm:px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors">
                    <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-xs sm:text-sm font-black text-white tabular-nums">
                      {item.rating}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="p-4 border-t border-white/5 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full sm:w-auto px-8 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-white/5 hover:border-white/10"
          >
            {loadingMore ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
