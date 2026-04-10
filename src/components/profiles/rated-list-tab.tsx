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
}

export function RatedListTab({ items, profileName }: RatedListTabProps) {
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
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30">
                Title
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-center">
                Year
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white/30 text-right">
                {firstName}&apos;s Rating
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {items.map((item) => (
              <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/content/${item.id}`}
                    className="flex items-center gap-2 text-sm font-bold text-white hover:text-white/80 transition-colors group-hover:translate-x-1 transition-transform"
                  >
                    {item.title}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm text-white/40 tabular-nums">{item.year ?? 'N/A'}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                    <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm font-black text-white tabular-nums">
                      {item.rating}/10
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
