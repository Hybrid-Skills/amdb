'use client';

import * as React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type Period = '7d' | '30d' | '3m' | '1y';

const PERIODS: { value: Period; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '1y', label: '1Y' },
];

interface ActivityChartProps {}

type DataPoint = { date: string; MOVIE: number; TV_SHOW: number; ANIME: number };

function formatLabel(date: string, period: Period): string {
  const d = new Date(date + 'T00:00:00');
  if (period === '7d') return d.toLocaleDateString('en', { weekday: 'short' });
  if (period === '30d') return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  if (period === '3m') return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function sample(data: DataPoint[], period: Period): DataPoint[] {
  if (period === '1y' && data.length > 52) {
    // Group by week
    const weeks: Record<string, DataPoint> = {};
    for (const d of data) {
      const dd = new Date(d.date + 'T00:00:00');
      const weekStart = new Date(dd);
      weekStart.setDate(dd.getDate() - dd.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks[key]) weeks[key] = { date: key, MOVIE: 0, TV_SHOW: 0, ANIME: 0 };
      weeks[key].MOVIE += d.MOVIE;
      weeks[key].TV_SHOW += d.TV_SHOW;
      weeks[key].ANIME += d.ANIME;
    }
    return Object.values(weeks);
  }
  if (period === '3m' && data.length > 30) {
    // Show every 3rd day
    return data.filter((_, i) => i % 3 === 0);
  }
  return data;
}

export function ActivityChart({}: ActivityChartProps) {
  const [period, setPeriod] = React.useState<Period>('7d');
  const [data, setData] = React.useState<DataPoint[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/user/activity?period=${period}`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period]);

  const displayData = sample(data, period).map((d) => ({
    ...d,
    label: formatLabel(d.date, period),
  }));

  const hasData = data.some((d) => d.MOVIE + d.TV_SHOW + d.ANIME > 0);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Titles Added</h3>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                period === p.value
                  ? 'bg-white text-black'
                  : 'text-white/40 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-3 mb-3">
        {[
          { key: 'MOVIE', label: 'Movies', color: '#6366f1' },
          { key: 'TV_SHOW', label: 'TV', color: '#06b6d4' },
          { key: 'ANIME', label: 'Anime', color: '#ec4899' },
        ].map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-[11px] text-white/40">{l.label}</span>
          </div>
        ))}
      </div>

      <div className={`h-36 transition-opacity ${loading ? 'opacity-30' : 'opacity-100'}`}>
        {!hasData && !loading ? (
          <div className="h-full flex items-center justify-center text-white/20 text-sm">
            No activity in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} barSize={period === '1y' ? 4 : period === '3m' ? 5 : 10} barGap={1}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={20}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  fontSize: 12,
                  color: 'white',
                }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar dataKey="MOVIE" name="Movies" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
              <Bar dataKey="TV_SHOW" name="TV" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
              <Bar dataKey="ANIME" name="Anime" stackId="a" fill="#ec4899" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
