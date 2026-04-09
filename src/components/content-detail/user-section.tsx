'use client';

import * as React from 'react';
import { Star, Bookmark, BookmarkCheck, Pencil, LogIn } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ContentDetail } from '@/lib/content-detail';
import { AddToListModal } from '@/components/add-to-list-modal';
import { RatingPicker } from '@/components/rating-picker';
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

type UserState = 'loading' | 'new' | 'planned' | 'rated';

interface UserContent {
  entryId: string | null;
  userRating: number | null;
  notes: string | null;
  watchStatus: string | null;
  plannedId: string | null;
}

interface UserContentSectionProps {
  data: ContentDetail;
}

function StarDisplay({ rating, max = 10, onEdit }: { rating: number; max?: number; onEdit?: () => void }) {
  const stars = 5;
  const raw = (rating / max) * stars;
  const filled = Math.floor(raw);
  const hasHalf = raw - filled >= 0.5;
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: stars }).map((_, i) => {
        if (i < filled) {
          return <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />;
        }
        if (i === filled && hasHalf) {
          return (
            <div key={i} className="relative w-5 h-5">
              <Star className="w-5 h-5 absolute inset-0 text-white/20" />
              <div className="absolute inset-0 overflow-hidden w-[50%]">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </div>
            </div>
          );
        }
        return <Star key={i} className="w-5 h-5 text-white/20" />;
      })}
      <span className="ml-2 text-white font-black text-lg">{rating}</span>
      <span className="text-white/40 text-sm">/ {max}</span>
      {onEdit && (
        <button
          onClick={onEdit}
          className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 font-bold text-xs hover:bg-white/10 hover:text-white transition-all active:scale-95"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
      <span className="w-1 h-5 rounded-full bg-primary inline-block" />
      {children}
    </h2>
  );
}

// Sign-in prompt — modal on desktop, bottom sheet on mobile
function SignInPrompt({ open, onClose }: { open: boolean; onClose: () => void }) {
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

export function UserContentSection({ data }: UserContentSectionProps) {
  const [userState, setUserState] = React.useState<UserState>('loading');
  const [userContent, setUserContent] = React.useState<UserContent>({
    entryId: null,
    userRating: null,
    notes: null,
    watchStatus: null,
    plannedId: null,
  });
  const [modalOpen, setModalOpen] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const [planLoading, setPlanLoading] = React.useState(false);
  const [pendingRating, setPendingRating] = React.useState<number | null>(null);

  // Resolve profile from cookie
  const profileId = React.useMemo(() => {
    if (typeof document === 'undefined') return null;
    return (
      document.cookie
        .split('; ')
        .find((c) => c.startsWith('amdb_profile_id='))
        ?.split('=')[1] ?? null
    );
  }, []);

  React.useEffect(() => {
    if (!profileId) {
      setUserState('new');
      return;
    }
    const params = new URLSearchParams({ profileId });
    if (data.tmdbId) params.set('tmdbId', String(data.tmdbId));
    if (data.malId) params.set('malId', String(data.malId));

    fetch(`/api/list/check?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.exists) {
          setUserState('rated');
          setUserContent({
            entryId: d.item?.id ?? null,
            userRating: d.userRating,
            notes: d.notes,
            watchStatus: d.watchStatus,
            plannedId: null,
          });
        } else if (d.planned) {
          setUserState('planned');
          setUserContent((prev) => ({ ...prev, plannedId: d.plannedId }));
        } else {
          setUserState('new');
        }
      })
      .catch(() => setUserState('new'));
  }, [profileId, data.tmdbId, data.malId]);

  function requireAuth(action: () => void) {
    if (!profileId) {
      setSignInOpen(true);
      return;
    }
    action();
  }

  async function handlePlan() {
    requireAuth(async () => {
      setPlanLoading(true);
      try {
        // Need contentId — ensure content exists first
        const ensureRes = await fetch('/api/content/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId: data.tmdbId,
            malId: data.malId,
            contentType: data.contentType,
          }),
        });
        if (!ensureRes.ok) return;
        const { amdbId: contentId } = await ensureRes.json();

        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, contentId, contentType: data.contentType }),
        });
        if (res.ok) {
          const result = await res.json();
          setUserState('planned');
          setUserContent((prev) => ({ ...prev, plannedId: result.id }));
        }
      } finally {
        setPlanLoading(false);
      }
    });
  }

  async function handleRemovePlan() {
    if (!userContent.plannedId) return;
    setUserState('new');
    const prevId = userContent.plannedId;
    setUserContent((prev) => ({ ...prev, plannedId: null }));
    try {
      const res = await fetch(`/api/watchlist/${prevId}`, { method: 'DELETE' });
      if (!res.ok) {
        setUserState('planned');
        setUserContent((prev) => ({ ...prev, plannedId: prevId }));
      }
    } catch {
      setUserState('planned');
      setUserContent((prev) => ({ ...prev, plannedId: prevId }));
    }
  }

  const modalItem = {
    id: data.id,
    tmdbId: data.tmdbId ?? undefined,
    malId: data.malId ?? undefined,
    title: data.title,
    year: data.year,
    posterUrl: data.posterUrl,
    tmdbRating: data.tmdbRating,
    overview: data.overview,
    contentType: data.contentType,
  };

  return (
    <>
      <section>
        <SectionTitle>Your Rating</SectionTitle>

        <AnimatePresence mode="wait">
          {userState === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-1.5"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex-1 h-8 md:h-11 rounded-md bg-white/10 animate-pulse" />
              ))}
            </motion.div>
          )}

          {userState === 'new' && (
            <motion.div
              key="new"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <RatingPicker
                value={null}
                onChange={(r) => requireAuth(() => { setPendingRating(r); setModalOpen(true); })}
              />
              <div className="hidden md:flex gap-3 flex-wrap">
                <button
                  onClick={handlePlan}
                  disabled={planLoading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm hover:bg-white/15 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Bookmark className="w-4 h-4" />
                  {planLoading ? 'Saving…' : 'Plan to Watch'}
                </button>
              </div>
            </motion.div>
          )}

          {userState === 'planned' && (
            <motion.div
              key="planned"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              <RatingPicker
                value={null}
                onChange={(r) => requireAuth(() => { setPendingRating(r); setModalOpen(true); })}
              />
              <div className="hidden md:flex gap-3 flex-wrap items-center">
                <button
                  onClick={handleRemovePlan}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold text-sm hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all active:scale-95 group"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span className="group-hover:hidden">Planned</span>
                  <span className="hidden group-hover:inline">Remove</span>
                </button>
              </div>
            </motion.div>
          )}

          {userState === 'rated' && (
            <motion.div
              key="rated"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-4"
            >
              {/* Star display + inline edit */}
              {userContent.userRating && (
                <StarDisplay
                  rating={userContent.userRating}
                  onEdit={() => requireAuth(() => setModalOpen(true))}
                />
              )}

              {/* Notes */}
              {userContent.notes && (
                <blockquote className="border-l-2 border-primary/50 pl-4 text-white/60 text-sm italic leading-relaxed max-w-lg">
                  "{userContent.notes}"
                </blockquote>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Add/Edit rating modal */}
      {modalOpen && (
        <AddToListModal
          key={data.tmdbId ?? data.malId ?? 'detail'}
          item={modalItem as any}
          profileId={profileId ?? ''}
          initialRating={pendingRating ?? userContent.userRating ?? undefined}
          initialNotes={userContent.notes}
          initialWatchStatus={userContent.watchStatus}
          startInEditMode={userState === 'rated'}
          onClose={() => { setModalOpen(false); setPendingRating(null); }}
          onSuccess={() => {
            setModalOpen(false);
            setPendingRating(null);
            // Re-check state after rating
            const params = new URLSearchParams({ profileId: profileId! });
            if (data.tmdbId) params.set('tmdbId', String(data.tmdbId));
            if (data.malId) params.set('malId', String(data.malId));
            fetch(`/api/list/check?${params}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.exists) {
                  setUserState('rated');
                  setUserContent({
                    entryId: d.item?.id ?? null,
                    userRating: d.userRating,
                    notes: d.notes,
                    watchStatus: d.watchStatus,
                    plannedId: null,
                  });
                }
              });
          }}
        />
      )}

      {/* Sign-in prompt */}
      <SignInPrompt open={signInOpen} onClose={() => setSignInOpen(false)} />

      {/* Mobile sticky bottom bar — Plan to Watch / Planned */}
      {(userState === 'new' || userState === 'planned') && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent pointer-events-none">
          <div className="pointer-events-auto">
            {userState === 'new' && (
              <button
                onClick={handlePlan}
                disabled={planLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/10 border border-white/10 text-white font-bold text-sm active:scale-95 disabled:opacity-50 transition-all"
              >
                <Bookmark className="w-4 h-4" />
                {planLoading ? 'Saving…' : 'Plan to Watch'}
              </button>
            )}
            {userState === 'planned' && (
              <button
                onClick={handleRemovePlan}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold text-sm active:scale-95 transition-all"
              >
                <BookmarkCheck className="w-4 h-4" />
                Planned — tap to remove
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
