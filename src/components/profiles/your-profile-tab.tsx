'use client';

import * as React from 'react';
import { Trash2, Check } from 'lucide-react';
import { AVATAR_EMOJIS, TIERS, type Tier } from '@/lib/gamification';
import { writeProfileCookie } from '@/lib/profile-cookie';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  isDefault: boolean;
}

interface YourProfileTabProps {
  profile: Profile;
  userTier: Tier;
  totalProfiles: number;
  onUpdate: (updates: Partial<Pick<Profile, 'name' | 'avatarColor' | 'avatarEmoji'>>) => void;
  onDelete: () => void;
}

export function YourProfileTab({ profile, userTier, totalProfiles, onUpdate, onDelete }: YourProfileTabProps) {
  const [name, setName] = React.useState(profile.name);
  const [nameSaving, setNameSaving] = React.useState(false);
  const [nameSaved, setNameSaved] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  // Sync if profile changes (profile switch)
  React.useEffect(() => { setName(profile.name); }, [profile.name]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile.name) return;
    setNameSaving(true);
    onUpdate({ name: trimmed });
    try {
      await fetch(`/api/profiles/${profile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch {
      onUpdate({ name: profile.name });
      setName(profile.name);
    } finally {
      setNameSaving(false);
    }
  }

  async function handleColorSelect(color: string) {
    onUpdate({ avatarColor: color });
    writeProfileCookie({ ...profile, avatarColor: color });
    await fetch(`/api/profiles/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarColor: color }),
    }).catch(() => onUpdate({ avatarColor: profile.avatarColor }));
  }

  async function handleEmojiSelect(emoji: string | null) {
    onUpdate({ avatarEmoji: emoji });
    writeProfileCookie({ ...profile, avatarEmoji: emoji });
    await fetch(`/api/profiles/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatarEmoji: emoji }),
    }).catch(() => onUpdate({ avatarEmoji: profile.avatarEmoji }));
  }

  async function handleDelete() {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, { method: 'DELETE' });
      if (res.ok) onDelete();
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  const canDelete = !profile.isDefault && totalProfiles > 1;

  return (
    <div className="space-y-6">
      {/* Name */}
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/30 block mb-2">
          Display Name
        </label>
        <div className="flex gap-2">
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
            <div className="flex items-center px-3 text-green-400 text-sm">
              <Check className="w-4 h-4" />
            </div>
          )}
        </div>
        <p className="text-xs text-white/20 mt-1">Changes save on blur or Enter</p>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white shrink-0"
          style={{ backgroundColor: profile.avatarColor }}
        >
          {profile.avatarEmoji ?? profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-white">{profile.name}</p>
          <p className="text-xs text-white/40">{userTier.emoji} {userTier.name}</p>
        </div>
      </div>

      {/* Color picker */}
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/30 block mb-3">
          Background Color
        </label>
        <div className="flex gap-3 flex-wrap">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`w-9 h-9 rounded-full transition-all ${profile.avatarColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* Emoji grid */}
      <div>
        <label className="text-xs font-bold uppercase tracking-widest text-white/30 block mb-3">
          Avatar Icon
        </label>
        <div className="grid grid-cols-6 gap-2">
          {/* Letter option */}
          <button
            onClick={() => handleEmojiSelect(null)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white transition-all hover:bg-white/10 ${!profile.avatarEmoji ? 'bg-white/15 ring-2 ring-white/40' : ''}`}
            style={{ backgroundColor: profile.avatarEmoji ? undefined : profile.avatarColor }}
          >
            {profile.name.charAt(0).toUpperCase()}
          </button>

          {AVATAR_EMOJIS.map(({ emoji, requiredTier }) => {
            const locked = requiredTier > userTier.level;
            const tierData = TIERS.find((t) => t.level === requiredTier);
            return (
              <div key={emoji} className="flex flex-col items-center gap-0.5">
                <button
                  disabled={locked}
                  title={locked ? `Unlocks at ${tierData?.name ?? ''} (score ${tierData?.minScore ?? ''}+)` : emoji}
                  onClick={() => !locked && handleEmojiSelect(emoji)}
                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all
                    ${locked ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
                    ${profile.avatarEmoji === emoji ? 'bg-white/15 ring-2 ring-white/40' : ''}
                  `}
                >
                  {locked ? '🔒' : emoji}
                </button>
                {locked && tierData && (
                  <span className="text-[9px] text-white/20 text-center leading-tight">
                    Score {tierData.minScore}+
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delete profile */}
      {canDelete && (
        <div className="pt-4 border-t border-white/5">
          {deleteConfirm ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 flex-1">Delete this profile? This cannot be undone.</p>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-xs text-white/40 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/20 px-3 py-1 rounded-lg"
              >
                {deleting ? '...' : 'Delete'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-sm text-red-400/60 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete profile
            </button>
          )}
        </div>
      )}
    </div>
  );
}
