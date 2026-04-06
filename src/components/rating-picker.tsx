'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RatingPickerProps {
  value: number | null;
  onChange: (rating: number) => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Unwatchable',
  2: 'Terrible',
  3: 'Bad',
  4: 'Below average',
  5: 'Average',
  6: 'Decent',
  7: 'Good',
  8: 'Great',
  9: 'Excellent',
  10: 'Masterpiece',
};

function ratingColor(r: number): string {
  if (r <= 3) return 'rgb(239,68,68)';
  if (r <= 5) return 'rgb(249,115,22)';
  if (r <= 7) return 'rgb(234,179,8)';
  if (r <= 9) return 'rgb(132,204,22)';
  return 'rgb(34,197,94)';
}

export function RatingPicker({ value, onChange }: RatingPickerProps) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const active = hovered ?? value;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const isActive = active !== null && n <= active;
          const isSelected = value !== null && n <= value && hovered === null;
          return (
            <motion.button
              key={n}
              type="button"
              whileHover={{ scale: 1.25, y: -4 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(n)}
              className={cn(
                'w-8 h-8 rounded-md text-sm font-bold transition-colors border',
                isActive
                  ? 'text-background border-transparent'
                  : 'text-muted-foreground border-muted-foreground/30 hover:border-transparent',
              )}
              style={isActive ? { backgroundColor: ratingColor(active!), borderColor: 'transparent' } : {}}
            >
              {n}
            </motion.button>
          );
        })}
      </div>
      <motion.div
        key={active ?? 'none'}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-5 text-sm font-medium"
        style={{ color: active ? ratingColor(active) : undefined }}
      >
        {active ? RATING_LABELS[active] : 'Select a rating'}
      </motion.div>
    </div>
  );
}
