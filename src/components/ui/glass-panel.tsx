'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className, style, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn('border border-white/10 rounded-2xl shadow-2xl overflow-hidden', className)}
      style={{
        backgroundColor: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
