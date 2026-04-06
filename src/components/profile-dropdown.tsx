'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, User, Plus, Check, X, LogOut } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { Profile } from './profile-selector';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

interface ProfileDropdownProps {
  onProfileSwitch?: (profile: Profile) => void;
  className?: string;
}

export function ProfileDropdown({ onProfileSwitch, className }: ProfileDropdownProps) {
  const { data: session, status } = useSession();
  const [profiles, setProfiles] = React.useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = React.useState<Profile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [dropdownView, setDropdownView] = React.useState<'menu' | 'switcher' | 'adding'>('menu');
  const [newName, setNewName] = React.useState('');
  const [newColor, setNewColor] = React.useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
  const [isAdding, setIsAdding] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, right: 0 });
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  const refreshProfiles = async () => {
    const res = await fetch('/api/profiles');
    if (res.ok) {
      const data: Profile[] = await res.json();
      setProfiles(data);
      const savedId = localStorage.getItem('amdb_last_profile_id');
      const p = data.find((x) => x.id === savedId) ?? data.find((x) => x.isDefault) ?? data[0];
      setActiveProfile(p);
      if (onProfileSwitch && p) onProfileSwitch(p);
    }
  };

  React.useEffect(() => {
    if (status === 'authenticated') refreshProfiles();
  }, [status]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) {
        setIsDropdownOpen(false);
        setDropdownView('menu');
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

  const handleSwitchProfile = (p: Profile) => {
    setActiveProfile(p);
    localStorage.setItem('amdb_last_profile_id', p.id);
    setIsDropdownOpen(false);
    setDropdownView('menu');
    if (onProfileSwitch) onProfileSwitch(p);
  };

  const handleAddProfile = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), avatarColor: newColor }),
    });
    if (res.ok) {
      const p = await res.json();
      setNewName('');
      await refreshProfiles();
      handleSwitchProfile(p);
    }
    setIsAdding(false);
  };

  if (status !== 'authenticated' || !activeProfile) {
    return (
      <button
        onClick={() => signIn()}
        className={cn("px-4 py-1.5 text-xs font-black uppercase tracking-widest bg-black/40 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl flex items-center gap-2", className)}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        Sign In
      </button>
    );
  }

  const dropdownPanel = mounted && createPortal(
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
            width: 288,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            zIndex: 9999,
          }}
          className="border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-white"
        >
          {dropdownView === 'menu' && (
            <div className="p-2 space-y-1">
              <div className="px-3 py-2.5 flex items-center gap-3 border-b border-white/5 mb-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black text-white shrink-0 shadow-lg"
                  style={{ backgroundColor: activeProfile.avatarColor }}
                >
                  {activeProfile.name[0].toUpperCase()}
                </div>
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[13px] font-medium text-white truncate">{activeProfile.name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-black uppercase tracking-widest text-white/40 shrink-0">Active</span>
                  </div>
                  <p className="text-[10px] text-white/20 truncate">{session?.user?.email ?? 'Logged In'}</p>
                </div>
              </div>
              <button
                onClick={() => setDropdownView('switcher')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left font-medium"
              >
                <User className="w-4 h-4" /> Switch Profile
              </button>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors text-left font-medium"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}

          {dropdownView === 'switcher' && (
            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
              <div
                className="px-3 py-2 flex items-center justify-between sticky top-0 border-b border-white/5 mb-1"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
              >
                <p className="text-xs font-black uppercase tracking-widest text-white/40">Switch Profile</p>
                <button onClick={() => setDropdownView('menu')} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSwitchProfile(p)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all text-left group",
                    p.id === activeProfile.id ? "bg-purple-500/20 text-white ring-1 ring-purple-500/40" : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div
                    className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow"
                    style={{ backgroundColor: p.avatarColor }}
                  >
                    {p.name[0].toUpperCase()}
                  </div>
                  <span className="flex-1 font-medium">{p.name}</span>
                  {p.id === activeProfile.id && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(34,197,94,0.5)]" />}
                </button>
              ))}
              {profiles.length < 5 && (
                <button
                  onClick={() => {
                setNewColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
                setDropdownView('adding');
              }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/40 hover:text-white hover:bg-white/5 rounded-xl transition-colors text-left font-medium border border-dashed border-white/10 mt-2"
                >
                  <Plus className="w-4 h-4" /> Add Profile
                </button>
              )}
            </div>
          )}

          {dropdownView === 'adding' && (
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-white/40 mb-3">New Profile</p>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Name..."
                  maxLength={30}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10 placeholder:text-white/20 font-medium"
                  onKeyDown={e => e.key === 'Enter' && handleAddProfile()}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDropdownView('switcher')}
                  className="flex-1 px-4 py-2 text-xs font-bold text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProfile}
                  disabled={!newName.trim() || isAdding}
                  className="flex-1 px-4 py-2 text-xs font-black uppercase tracking-widest text-white bg-white/10 hover:bg-white/20 disabled:opacity-20 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isAdding ? '...' : <><Check className="w-3.5 h-3.5" /> Create</>}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        onClick={openDropdown}
        className={cn(
          "flex items-center gap-2 p-1 pr-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-xl transition-all active:scale-95",
          isDropdownOpen && "ring-2 ring-white/20"
        )}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-inner"
          style={{ backgroundColor: activeProfile.avatarColor }}
        >
          {activeProfile.name[0].toUpperCase()}
        </div>
        <ChevronDown className={cn("w-3.5 h-3.5 text-white/40 transition-transform", isDropdownOpen && "rotate-180")} />
      </button>

      {dropdownPanel}
    </div>
  );
}
