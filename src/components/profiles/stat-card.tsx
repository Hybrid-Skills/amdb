'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  subvalue?: string;
  icon?: string;
  dim?: boolean;
}

export function StatCard({ label, value, subvalue, icon, dim }: StatCardProps) {
  return (
    <div className={`rounded-2xl border border-white/8 bg-white/4 p-4 flex flex-col gap-1 ${dim ? 'opacity-40' : ''}`}>
      {icon && <span className="text-xl mb-1">{icon}</span>}
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
      {subvalue && <p className="text-xs text-white/40 font-medium">{subvalue}</p>}
      <p className="text-xs text-white/50 mt-auto pt-1">{label}</p>
    </div>
  );
}
