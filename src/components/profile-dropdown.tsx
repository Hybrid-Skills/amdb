'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, LogOut, LogIn, Settings } from 'lucide-react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { SignInPrompt } from '@/components/sign-in-prompt';

interface ProfileDropdownProps {
  className?: string;
}

export function ProfileDropdown({ className }: ProfileDropdownProps) {
  const { data: session, status } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, right: 0 });
  const [mounted, setMounted] = React.useState(false);
  const [signInOpen, setSignInOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsDropdownOpen((o) => !o);
  };

  const avatarColor = session?.user?.avatarColor ?? '#6366f1';
  const avatarEmoji = session?.user?.avatarEmoji ?? null;
  const displayName = session?.user?.username ?? session?.user?.name ?? 'My Profile';

  if (mounted && status === 'unauthenticated') {
    return (
      <>
        <button
          onClick={() => setSignInOpen(true)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl text-white/60 hover:text-white text-sm font-medium transition-all active:scale-95',
            className,
          )}
        >
          <LogIn className="w-4 h-4" /> Sign In
        </button>
        <SignInPrompt open={signInOpen} onClose={() => setSignInOpen(false)} />
      </>
    );
  }

  if (status === 'loading' || !session) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 p-1 pr-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl',
          className,
        )}
      >
        <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
        <div className="w-3.5 h-3.5" />
      </div>
    );
  }

  const dropdownPanel =
    mounted &&
    createPortal(
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            ref={panelRef}
            key="profile-dropdown"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'fixed',
              top: menuPos.top,
              right: menuPos.right,
              width: 256,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              zIndex: 9999,
            }}
            className="border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white"
          >
            <div className="p-2 space-y-1">
              {/* User info */}
              <div className="px-3 py-2.5 flex items-center gap-3 border-b border-white/5 mb-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg"
                  style={{ backgroundColor: avatarColor }}
                >
                  <span className="text-lg leading-none">
                    {avatarEmoji ?? displayName[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="text-[13px] font-medium text-white truncate">{displayName}</span>
                  <p className="text-[10px] text-white/30 truncate">{session.user.email ?? ''}</p>
                </div>
              </div>

              <Link
                href={`/user/${session.user.username}`}
                onClick={() => setIsDropdownOpen(false)}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left font-medium"
              >
                <Settings className="w-4 h-4" /> Account Settings
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left font-medium"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body,
    );

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        onClick={openDropdown}
        className={cn(
          'flex items-center gap-2 p-1 pr-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl transition-all active:scale-95',
          isDropdownOpen && 'ring-2 ring-white/20',
        )}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-inner"
          style={{ backgroundColor: avatarColor }}
        >
          <span className="leading-none">
            {avatarEmoji ?? displayName[0]?.toUpperCase() ?? '?'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-white/40 transition-transform',
            isDropdownOpen && 'rotate-180',
          )}
        />
      </button>

      {dropdownPanel}
    </div>
  );
}
