'use client';

import * as React from 'react';
import { LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

export function SignInPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const inner = (
    <div className="flex flex-col items-center gap-5 p-2">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <LogIn className="w-7 h-7 text-white/60" />
      </div>
      <div className="text-center">
        <p className="font-bold text-lg text-white">Sign in to continue</p>
        <p className="text-sm text-white/50 mt-1 max-w-xs">
          Create a free account to rate, plan, and track everything you watch.
        </p>
      </div>
      <button
        onClick={() => signIn('google')}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all active:scale-95"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>
      <button
        onClick={onClose}
        className="text-xs text-white/30 hover:text-white/60 transition-colors"
      >
        Maybe later
      </button>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white">
          <DialogTitle className="sr-only">Sign in required</DialogTitle>
          <DialogDescription className="sr-only">Sign in to rate and plan content</DialogDescription>
          {inner}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="bg-zinc-950 border-white/10 text-white pb-8 px-4">
        <DrawerTitle className="sr-only">Sign in required</DrawerTitle>
        <DrawerDescription className="sr-only">Sign in to rate and plan content</DrawerDescription>
        {inner}
      </DrawerContent>
    </Drawer>
  );
}
