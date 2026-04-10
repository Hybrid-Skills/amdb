'use client';

import * as React from 'react';
import { Check, ChevronDown, Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { AVATAR_EMOJIS, type Tier } from '@/lib/gamification';
import { AWARDS } from '@/lib/awards';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

interface UserData {
  id: string;
  name: string;
  username: string | null;
  avatarColor: string;
  avatarEmoji: string | null;
}

interface YourProfileTabProps {
  profile: UserData;
  userTier: Tier;
  unlockedAwardIds: Set<string>;
  onUpdate: (updates: Partial<Pick<UserData, 'name' | 'username' | 'avatarColor' | 'avatarEmoji'>>) => void;
}

export function YourProfileTab({ profile, userTier, unlockedAwardIds, onUpdate }: YourProfileTabProps) {
  const { update: updateSession } = useSession();
  const [name, setName] = React.useState(profile.name);
  const [username, setUsername] = React.useState(profile.username ?? '');
  const [nameSaving, setNameSaving] = React.useState(false);
  const [usernameSaving, setUsernameSaving] = React.useState(false);
  const [nameSaved, setNameSaved] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [colorOpen, setColorOpen] = React.useState(false);
  const colorRef = React.useRef<HTMLDivElement>(null);

  // Sync if profile changes
  React.useEffect(() => { 
    setName(profile.name); 
    setUsername(profile.username ?? '');
  }, [profile.name, profile.username]);

  // Close color dropdown on outside click
  React.useEffect(() => {
    if (!colorOpen) return;
    function handler(e: MouseEvent) {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setColorOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [colorOpen]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile.name) return;
    setNameSaving(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      onUpdate({ name: trimmed });
      await updateSession();
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch {
      setName(profile.name);
    } finally {
      setNameSaving(false);
    }
  }

  async function saveUsername() {
    const trimmed = username.trim();
    if (!trimmed || trimmed === profile.username) {
      setUsernameError(null);
      return;
    }

    // Validation
    const regex = /^[a-zA-Z0-9._-]+$/;
    if (!regex.test(trimmed)) {
      setUsernameError('Only letters, numbers, ., _, and - are allowed');
      return;
    }
    setUsernameError(null);

    setUsernameSaving(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      
      if (res.status === 409) {
        setUsernameError('Username already taken');
        return;
      }
      
      if (!res.ok) throw new Error();
      
      onUpdate({ username: trimmed });
      await updateSession();
    } catch {
      setUsername(profile.username ?? '');
    } finally {
      setUsernameSaving(false);
    }
  }

  async function handleColorSelect(color: string) {
    setColorOpen(false);
    onUpdate({ avatarColor: color });
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarColor: color }),
    }).then(() => updateSession())
      .catch(() => onUpdate({ avatarColor: profile.avatarColor }));
  }

  async function handleEmojiSelect(emoji: string | null) {
    onUpdate({ avatarEmoji: emoji });
    await fetch('/api/user', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarEmoji: emoji }),
    }).then(() => updateSession())
      .catch(() => onUpdate({ avatarEmoji: profile.avatarEmoji }));
  }

  // Sort emojis: currently selected first, then rest in original order
  const sortedEmojis = React.useMemo(() => {
    const unlocked = AVATAR_EMOJIS.filter((e) => unlockedAwardIds.has(e.awardId));
    const locked = AVATAR_EMOJIS.filter((e) => !unlockedAwardIds.has(e.awardId));
    const combined = [...unlocked, ...locked];
    // Move currently selected to front
    if (!profile.avatarEmoji) return combined;
    const idx = combined.findIndex((e) => e.emoji === profile.avatarEmoji);
    if (idx <= 0) return combined;
    return [combined[idx], ...combined.slice(0, idx), ...combined.slice(idx + 1)];
  }, [profile.avatarEmoji, unlockedAwardIds]);

  return (
    <div className="space-y-6">
      {/* Name + color row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-white/30 block mb-2">
            Display Name
          </label>
          <div className="flex gap-2 items-center">
            {/* Color picker trigger */}
            <div ref={colorRef} className="relative shrink-0">
              <button
                onClick={() => setColorOpen((v) => !v)}
                className="flex items-center gap-1.5 h-10 px-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                title="Change background color"
              >
                <span
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: profile.avatarColor }}
                />
                <ChevronDown className="w-3.5 h-3.5 text-white/40" />
              </button>

              {colorOpen && (
                <div className="absolute top-full left-0 mt-1.5 z-50 bg-zinc-900 border border-white/10 rounded-xl p-4 shadow-xl">
                  <div className="grid grid-cols-4 gap-3">
                    {AVATAR_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        className="relative w-9 h-9 rounded-full transition-all hover:scale-110"
                        style={{ backgroundColor: color }}
                      >
                        {profile.avatarColor === color && (
                          <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === 'Enter' && saveName()}
              maxLength={30}
              placeholder="Your name"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 placeholder:text-white/20"
            />
            {nameSaved && (
              <div className="flex items-center px-1 text-green-400">
                <Check className="w-4 h-4" />
              </div>
            )}
          </div>
          <p className="text-[10px] text-white/20 mt-1">Saves on blur or Enter</p>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-white/30 block mb-2">
            Username Handle
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={saveUsername}
              onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
              maxLength={30}
              placeholder="username"
              className={cn(
                "w-full bg-white/5 border rounded-xl pl-8 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-all",
                usernameError 
                  ? "border-red-500/50 focus:ring-red-500/20" 
                  : "border-white/10 focus:ring-white/20"
              )}
            />
          </div>
          {usernameError ? (
            <p className="text-[10px] text-red-500 mt-1">{usernameError}</p>
          ) : (
            <p className="text-[10px] text-white/20 mt-1">Letters, numbers, ., _, -</p>
          )}
        </div>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0 shadow-2xl"
          style={{ backgroundColor: profile.avatarColor }}
        >
          {profile.avatarEmoji ?? (profile.username?.[0] ?? profile.name?.[0] ?? '?').toUpperCase()}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-bold text-white truncate">{profile.name}</p>
          <p className="text-xs text-white/40 truncate">@{profile.username ?? 'no-handle'}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-white/60">
              {userTier.emoji} {userTier.name}
            </span>
          </div>
        </div>
      </div>

      {/* Emoji grid */}
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/30 block mb-3">
          Avatar Icon
        </label>
        <div className="grid grid-cols-5 gap-2">
          {/* Letter option */}
          <button
            onClick={() => handleEmojiSelect(null)}
            className={`w-full aspect-square rounded-xl flex items-center justify-center text-2xl sm:text-4xl font-black text-white transition-all hover:bg-white/10 ${!profile.avatarEmoji ? 'bg-white/15 ring-2 ring-white/40' : ''}`}
            style={{ backgroundColor: profile.avatarEmoji ? undefined : profile.avatarColor }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </button>

          {sortedEmojis.map(({ emoji, awardId }) => {
            const locked = !unlockedAwardIds.has(awardId);
            const award = AWARDS.find((a) => a.id === awardId);
            return (
              <div key={emoji} className="flex flex-col items-center gap-0.5">
                <button
                  onClick={() => !locked && handleEmojiSelect(emoji)}
                  title={locked ? `Unlock "${award?.name ?? awardId}" to use this` : emoji}
                  className={`relative w-full aspect-square rounded-xl flex items-center justify-center text-3xl sm:text-5xl transition-all
                    ${locked ? 'cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
                    ${profile.avatarEmoji === emoji ? 'bg-white/15 ring-2 ring-white/40' : ''}
                  `}
                >
                  <span className={locked ? 'grayscale opacity-30' : ''}>{emoji}</span>
                  {locked && (
                    <Lock className="absolute bottom-1 right-1 w-3 h-3 text-white/60" />
                  )}
                </button>
                {locked && award && (
                  <span className="text-[9px] text-white/20 text-center leading-tight">
                    {award.icon} {award.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
