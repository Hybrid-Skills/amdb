'use client';

import * as React from 'react';
import { Star, Bookmark, BookmarkCheck, Pencil, LogIn, Share2 } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ContentDetail } from '@/lib/content-detail';
import { AddToListModal } from '@/components/add-to-list-modal';
import { RatingPicker, RATING_LABELS, ratingColor } from '@/components/rating-picker';
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
  const [activeRating, setActiveRating] = React.useState<number | null>(null);

  // Resolve profile from cookie, falling back to /api/profiles if not set
  // (happens when user signs in directly on the detail page)
  const cookieProfileId = typeof document !== 'undefined'
    ? document.cookie.split('; ').find((c) => c.startsWith('amdb_profile_id='))?.split('=')[1] ?? null
    : null;
  const [profileId, setProfileId] = React.useState<string | null>(cookieProfileId);

  React.useEffect(() => {
    if (profileId) return;
    // Only fetch profiles if a NextAuth session cookie exists —
    // i.e. user just signed in on this page but the profile cookie wasn't set yet.
    const hasSession = document.cookie.split('; ').some(
      (c) => c.startsWith('next-auth.session-token=') || c.startsWith('__Secure-next-auth.session-token=')
    );
    if (!hasSession) { setUserState('new'); return; }

    fetch('/api/profiles')
      .then((r) => r.ok ? r.json() : null)
      .then((profiles) => {
        if (!profiles?.length) { setUserState('new'); return; }
        const profile = profiles.find((p: any) => p.isDefault) ?? profiles[0];
        document.cookie = `amdb_profile_id=${profile.id}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        setProfileId(profile.id);
      })
      .catch(() => setUserState('new'));
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
            ...(data.tmdbId ? { tmdbId: data.tmdbId } : {}),
            ...(data.malId ? { malId: data.malId } : {}),
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

  async function handleShare() {
    const ratingSource = data.omdbRatings?.find(r => r.Source === 'Internet Movie Database') ? 'IMDb' : data.malScore ? 'MAL' : 'TMDB';
    const ratingVal = data.omdbRatings?.find(r => r.Source === 'Internet Movie Database')?.Value.split('/')[0] || data.malScore || data.tmdbRating || 'N/A';
    const typeLabel = data.contentType === 'MOVIE' ? 'movie' : data.contentType === 'TV_SHOW' ? 'TV show' : 'anime';
    const url = window.location.href;
    const title = data.title;

    let text = "";
    if (userState === 'new') {
      text = `Found this ${typeLabel} with ⭐ ${ratingVal} ${ratingSource}. Add ${title} to your watch list here`;
    } else if (userState === 'planned') {
      text = `I am planning to watch ${title}. This ${typeLabel} has an ${ratingSource.toLowerCase()} rating of ${ratingVal}. You should add it to your list as well`;
    } else if (userState === 'rated' && userContent.userRating) {
      const r = userContent.userRating;
      const adj = r >= 9 ? "solid " : r >= 7 ? "decent " : r >= 5 ? "passable " : "";
      text = `I watched ${title}, it's a ${adj}${r}/10. Add it to your list here`;
    } else {
      text = `Check out ${title} on AMDB`;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Clipboard failed:', err);
      }
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

  // Pre-populate the modal with data we already have — avoids redundant /api/content fetch
  const prefetchedContent = React.useMemo(() => ({
    ...modalItem,
    backdropUrl: data.backdropUrl,
    tagline: data.tagline,
    genres: data.genres,
    runtimeMins: data.runtimeMins,
    adult: data.adult,
    networks: data.networks,
    first_air_date: data.firstAirDate,
    last_air_date: data.lastAirDate,
    number_of_seasons: data.numberOfSeasons,
    number_of_episodes: data.numberOfEpisodes,
    episode_run_time: data.episodeRuntime ? [data.episodeRuntime] : [],
    videos: { results: data.videos },
    similar: { results: data.similar },
    cast: data.cast,
    watchProviders: data.watchProviders,
    omdbRatings: data.omdbRatings,
  }), [data.id]);

  return (
    <>
      <section className="min-h-[50px]">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-primary inline-block" />
            Your Rating
          </h2>

          {userState === 'loading' && (
            <div className="w-24 h-6 rounded-md bg-white/10 animate-pulse ml-1" />
          )}

          {userState === 'rated' && userContent.userRating && (
            <div className="flex items-center gap-2.5 ml-1">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500 shrink-0" />
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-white leading-none">{userContent.userRating}</span>
                <span 
                  className="text-xs font-bold uppercase tracking-tight"
                  style={{ color: ratingColor(userContent.userRating) }}
                >
                  {RATING_LABELS[userContent.userRating]}
                </span>
              </div>
              <button
                onClick={() => requireAuth(() => setModalOpen(true))}
                className="ml-1 p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white transition-all active:scale-95 group"
                title="Edit rating"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          )}

          {(userState === 'new' || userState === 'planned') && (
            <AnimatePresence mode="wait">
              <motion.span
                key={activeRating ?? 'idle'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm font-medium"
                style={{ color: activeRating ? ratingColor(activeRating) : 'rgba(255,255,255,0.3)' }}
              >
                {activeRating ? RATING_LABELS[activeRating] : 'Not rated yet'}
              </motion.span>
            </AnimatePresence>
          )}
        </div>

        <div className="min-h-[32px] md:min-h-[44px]">
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
              className="flex flex-col gap-3"
            >
              <RatingPicker
                value={null}
                onChange={(r) => requireAuth(() => { setPendingRating(r); setModalOpen(true); })}
                onActiveRating={setActiveRating}
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
              className="flex flex-col gap-3"
            >
              <RatingPicker
                value={null}
                onChange={(r) => requireAuth(() => { setPendingRating(r); setModalOpen(true); })}
                onActiveRating={setActiveRating}
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
              <p className="text-white/60 text-sm italic leading-relaxed max-w-lg">
                {userContent.notes || "No review notes left"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
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
          prefetchedContent={prefetchedContent}
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

      {/* Mobile sticky bottom bar */}
      {userState !== 'loading' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-4 pb-6 pt-8 bg-gradient-to-t from-black to-transparent pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            {userState === 'new' && (
              <>
                <button
                  onClick={handleShare}
                  className="w-14 flex items-center justify-center rounded-xl bg-white/80 border border-white/10 text-black active:scale-95 transition-all shadow-xl shadow-black/20"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handlePlan}
                  disabled={planLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/90 border border-white/90 text-black font-bold text-sm active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-black/20"
                >
                  <Bookmark className="w-4 h-4" />
                  {planLoading ? 'Saving…' : 'Plan to Watch'}
                </button>
              </>
            )}
            {userState === 'planned' && (
              <>
                <button
                  onClick={handleShare}
                  className="w-14 flex items-center justify-center rounded-xl bg-white/80 border border-white/10 text-black active:scale-95 transition-all shadow-xl shadow-black/20"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <button
                  onClick={handleRemovePlan}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-blue-500/90 border border-blue-500/90 text-white font-bold text-sm active:scale-95 transition-all shadow-xl shadow-black/20"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  Planned
                </button>
              </>
            )}
            {userState === 'rated' && (
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-primary border border-primary text-black font-bold text-sm active:scale-95 transition-all shadow-xl shadow-black/20"
              >
                <Share2 className="w-4 h-4" />
                Share with friends
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
