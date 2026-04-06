'use client';

import * as React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ReleaseDate {
  country: string;
  date: string;
  certification: string;
  type: string;
}

interface ReleaseDatesSectionProps {
  dates: ReleaseDate[];
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ReleaseDatesSection({ dates }: ReleaseDatesSectionProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!dates?.length) return null;

  const validDates = dates
    .filter((rd) => rd.type === 'Theatrical' || rd.type === 'Premiere')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (!validDates.length) return null;

  const minDate = validDates[0].date;
  const maxDate = validDates[validDates.length - 1].date;

  return (
    <section>
      <h2 className="text-xl font-bold tracking-tight mb-3 md:mb-4 flex items-center gap-2">
        <span className="w-1 h-5 rounded-full bg-primary inline-block" />
        Global Release Dates
      </h2>
      <p className="text-sm text-white/60 mb-4">
        Global release dates vary from{' '}
        <span className="text-white font-bold">{formatDate(minDate)}</span> to{' '}
        <span className="text-white font-bold">{formatDate(maxDate)}</span>.
      </p>

      <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-colors hover:border-white/20">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-5 py-4 flex items-center justify-between group transition-colors"
        >
          <span className="text-sm font-black uppercase tracking-widest text-white/80 group-hover:text-white transition-colors">
            View regionwise list
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-white/40" />
          ) : (
            <ChevronDown className="w-5 h-5 text-white/40" />
          )}
        </button>

        {isOpen && (
          <div className="px-5 pb-5 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 border-t border-white/5 mt-0 animate-in fade-in duration-200">
            {validDates.map((rd, i) => (
              <div key={i} className="p-2.5 rounded-lg border border-white/10 bg-white/5 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/60">{rd.country}</span>
                  {rd.certification && (
                    <span className="text-[10px] font-bold text-red-400 border border-red-500/30 px-1 rounded">
                      {rd.certification}
                    </span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-0.5">{formatDate(rd.date)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
