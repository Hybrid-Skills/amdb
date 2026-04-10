'use client';

import type { Award } from '@/lib/awards';

interface AwardBadgeProps {
  award: Award;
  unlocked: boolean;
}

function ShieldPath() {
  return (
    <path d="M50 4 L90 18 L90 50 Q90 78 50 96 Q10 78 10 50 L10 18 Z" />
  );
}

function HexPath() {
  return (
    <path d="M50 3 L93 27.5 L93 72.5 L50 97 L7 72.5 L7 27.5 Z" />
  );
}

function StarPath() {
  return (
    <path d="M50 5 L61 35 L93 35 L68 54 L78 84 L50 65 L22 84 L32 54 L7 35 L39 35 Z" />
  );
}

export function AwardBadge({ award, unlocked }: AwardBadgeProps) {
  const gradId = `grad-${award.id}`;

  const ShapeEl = () => {
    if (award.shape === 'shield') return <ShieldPath />;
    if (award.shape === 'hexagon') return <HexPath />;
    if (award.shape === 'star') return <StarPath />;
    return <circle cx="50" cy="50" r="46" />;
  };

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className="relative">
        <svg
          viewBox="0 0 100 100"
          className={`w-16 h-16 transition-all duration-300 ${unlocked ? 'drop-shadow-lg' : 'grayscale opacity-35'}`}
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={unlocked ? award.color : '#374151'} />
              <stop offset="100%" stopColor={unlocked ? award.color2 : '#1f2937'} />
            </linearGradient>
          </defs>
          <ShapeEl />
          {/* Shape fill */}
          <ShapeEl />
          <g>
            {award.shape === 'shield' && <ShieldPath />}
            {award.shape === 'hexagon' && <HexPath />}
            {award.shape === 'star' && <StarPath />}
            {award.shape === 'circle' && <circle cx="50" cy="50" r="46" />}
          </g>
        </svg>

        {/* Proper SVG badge */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className={`absolute inset-0 w-full h-full ${unlocked ? '' : 'opacity-0'}`}>
            <defs>
              <linearGradient id={`${gradId}-fill`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={award.color} />
                <stop offset="100%" stopColor={award.color2} />
              </linearGradient>
            </defs>
            {award.shape === 'circle' && <circle cx="50" cy="50" r="46" fill={`url(#${gradId}-fill)`} />}
            {award.shape === 'shield' && <path d="M50 4 L90 18 L90 50 Q90 78 50 96 Q10 78 10 50 L10 18 Z" fill={`url(#${gradId}-fill)`} />}
            {award.shape === 'hexagon' && <path d="M50 3 L93 27.5 L93 72.5 L50 97 L7 72.5 L7 27.5 Z" fill={`url(#${gradId}-fill)`} />}
            {award.shape === 'star' && <path d="M50 5 L61 35 L93 35 L68 54 L78 84 L50 65 L22 84 L32 54 L7 35 L39 35 Z" fill={`url(#${gradId}-fill)`} />}
          </svg>

          {/* Locked bg */}
          <svg viewBox="0 0 100 100" className={`absolute inset-0 w-full h-full ${unlocked ? 'opacity-0' : ''}`}>
            {award.shape === 'circle' && <circle cx="50" cy="50" r="46" fill="#1f2937" />}
            {award.shape === 'shield' && <path d="M50 4 L90 18 L90 50 Q90 78 50 96 Q10 78 10 50 L10 18 Z" fill="#1f2937" />}
            {award.shape === 'hexagon' && <path d="M50 3 L93 27.5 L93 72.5 L50 97 L7 72.5 L7 27.5 Z" fill="#1f2937" />}
            {award.shape === 'star' && <path d="M50 5 L61 35 L93 35 L68 54 L78 84 L50 65 L22 84 L32 54 L7 35 L39 35 Z" fill="#1f2937" />}
          </svg>

          <span className={`relative z-10 text-2xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
            {unlocked ? award.icon : '🔒'}
          </span>
        </div>

        {/* Glow ring for unlocked */}
        {unlocked && (
          <div
            className="absolute inset-0 rounded-full opacity-30 blur-md -z-10 scale-110"
            style={{ backgroundColor: award.color }}
          />
        )}
      </div>

      <div className="text-center max-w-[80px]">
        <p className={`text-[11px] font-bold leading-tight ${unlocked ? 'text-white' : 'text-white/30'}`}>
          {award.name}
        </p>
        <p className={`text-[10px] mt-0.5 leading-tight ${unlocked ? 'text-white/40' : 'text-white/20'}`}>
          {award.unlockHint}
        </p>
      </div>
    </div>
  );
}
