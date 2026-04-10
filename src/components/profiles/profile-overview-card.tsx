'use client';

import * as React from 'react';
import { Check, Pencil, Lock, ChevronDown } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getTier, getNextTier, AVATAR_COLORS, AVATAR_EMOJIS } from '@/lib/gamification';
import { AWARDS } from '@/lib/awards';
import { cn } from '@/lib/utils';

interface ProfileOverviewCardProps {
  user: {
    id: string;
    name: string;
    username: string;
    email: string | null;
    avatarColor: string;
    avatarEmoji: string | null;
  };
  score: number;
  isOwner: boolean;
  unlockedAwardIds: Set<string>;
  onUpdate: (updates: {
    name: string;
    username: string;
    avatarColor: string;
    avatarEmoji: string | null;
  }) => Promise<void>;
}

export function ProfileOverviewCard({
  user,
  score,
  isOwner,
  unlockedAwardIds,
  onUpdate,
}: ProfileOverviewCardProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editName, setEditName] = React.useState(user.name);
  const [editUsername, setEditUsername] = React.useState(user.username);
  const [editColor, setEditColor] = React.useState(user.avatarColor);
  const [editEmoji, setEditEmoji] = React.useState(user.avatarEmoji);
  const [usernameError, setUsernameError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const tier = getTier(score);
  const nextTier = getNextTier(tier);

  const progress = nextTier
    ? ((score - tier.minScore) / (nextTier.minScore - tier.minScore)) * 100
    : 100;

  // Sync state if user prop changes externally
  React.useEffect(() => {
    if (!isEditing) {
      setEditName(user.name);
      setEditUsername(user.username);
      setEditColor(user.avatarColor);
      setEditEmoji(user.avatarEmoji);
    }
  }, [user, isEditing]);

  async function handleSave() {
    // Basic validation
    const trimmedUsername = editUsername.trim();
    const regex = /^[a-zA-Z0-9._-]+$/;
    if (!regex.test(trimmedUsername)) {
      setUsernameError('Only letters, numbers, ., _, and - are allowed');
      return;
    }
    setUsernameError(null);

    setSaving(true);
    try {
      await onUpdate({
        name: editName.trim(),
        username: trimmedUsername,
        avatarColor: editColor,
        avatarEmoji: editEmoji,
      });
      setIsEditing(false);
      
      // If username changed, redirect to new vanity URL
      if (trimmedUsername !== user.username) {
        router.push(`/user/${trimmedUsername}`);
      }
    } catch (err: any) {
      if (err.message?.includes('taken')) {
        setUsernameError('Username handled already taken');
      }
    } finally {
      setSaving(false);
    }
  }

  const sortedEmojis = React.useMemo(() => {
    const unlocked = AVATAR_EMOJIS.filter((e) => unlockedAwardIds.has(e.awardId));
    const locked = AVATAR_EMOJIS.filter((e) => !unlockedAwardIds.has(e.awardId));
    return [...unlocked, ...locked];
  }, [unlockedAwardIds]);

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-white/[0.03] border rounded-3xl transition-all duration-500',
        isEditing ? 'border-white/20 shadow-2xl' : 'border-white/10 hover:border-white/20',
      )}
    >
      {/* Background glow based on tier color */}
      <div
        className="absolute -top-24 -right-24 w-64 h-64 blur-[120px] opacity-20 transition-colors duration-1000"
        style={{ backgroundColor: tier.color }}
      />

      <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Top Section: Avatar + Identity + Tier */}
        <div className="flex items-start gap-4 sm:gap-6">
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center text-4xl sm:text-5xl font-black text-white shadow-2xl shrink-0 group relative overflow-hidden transition-colors duration-500"
            style={{ backgroundColor: isEditing ? editColor : user.avatarColor }}
          >
            {isEditing
              ? (editEmoji ?? editName.charAt(0).toUpperCase())
              : (user.avatarEmoji ?? user.name.charAt(0).toUpperCase())}
          </div>

          <div className="flex-1 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user.name}
                </h2>
                {!isEditing && isOwner && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg bg-white/5 text-white/30 hover:text-white hover:bg-white/10 transition-all ml-1"
                    title="Edit Profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-col min-h-[40px] justify-center">
                <p className="text-white/40 text-sm sm:text-base font-medium">@{user.username}</p>
                {isOwner && (
                  <div className="h-4">
                    {user.email && (
                      <p className="text-white/20 text-[10px] sm:text-xs truncate max-w-[150px] sm:max-w-[200px]">
                        {user.email}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Tier Badge */}
            <div className="flex flex-col items-start sm:items-end gap-1">
              <div
                className="px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-2 border shadow-lg transition-transform hover:scale-105"
                style={{ backgroundColor: `${tier.color}15`, borderColor: `${tier.color}30` }}
              >
                <span className="text-base sm:text-lg">{tier.emoji}</span>
                <span
                  className="text-[10px] sm:text-xs font-bold uppercase tracking-widest"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </span>
              </div>
              <p className="hidden sm:block text-[10px] uppercase tracking-tighter text-white/20 font-bold">
                Level {tier.level}
              </p>
            </div>
          </div>
        </div>

        {/* Edit Form - Expanded */}
        {isEditing && (
          <div className="space-y-8 pt-6 border-t border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Display Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Display Name
                </label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={30}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                  placeholder="Your display name"
                />
              </div>

              {/* Username Handle */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Username Handle
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 text-sm">
                    @
                  </span>
                  <input
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    maxLength={20}
                    className={cn(
                      'w-full bg-white/5 border rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-2 transition-all',
                      usernameError
                        ? 'border-red-500/50 focus:ring-red-500/20'
                        : 'border-white/10 focus:ring-white/20',
                    )}
                    placeholder="handle"
                  />
                </div>
                {usernameError && (
                  <p className="text-[10px] text-red-500 font-bold">{usernameError}</p>
                )}
              </div>

              {/* Avatar Color */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Avatar Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setEditColor(color)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-all hover:scale-110 relative',
                        editColor === color && 'ring-2 ring-white ring-offset-4 ring-offset-black',
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {editColor === color && (
                        <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Avatar Emoji */}
              <div className="space-y-3 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-white/30">
                  Avatar Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                  <button
                    onClick={() => setEditEmoji(null)}
                    className={cn(
                      'aspect-square rounded-xl flex items-center justify-center text-xl font-black transition-all hover:bg-white/10',
                      !editEmoji ? 'bg-white/20 ring-2 ring-white/40' : 'bg-white/5 text-white/20',
                    )}
                  >
                    {editName.charAt(0).toUpperCase()}
                  </button>
                  {sortedEmojis.map(({ emoji, awardId }) => {
                    const locked = !unlockedAwardIds.has(awardId);
                    return (
                      <button
                        key={emoji}
                        disabled={locked}
                        onClick={() => setEditEmoji(emoji)}
                        className={cn(
                          'aspect-square rounded-xl flex items-center justify-center text-2xl transition-all relative group/emoji',
                          locked ? 'opacity-20 grayscale cursor-not-allowed' : 'hover:bg-white/10',
                          editEmoji === emoji ? 'bg-white/20 ring-2 ring-white/40' : 'bg-white/5',
                        )}
                      >
                        {emoji}
                        {locked && (
                          <Lock className="absolute bottom-1 right-1 w-2.5 h-2.5 text-white/50" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t border-white/5">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white/50 hover:text-white transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-white text-black rounded-xl text-sm font-black hover:scale-105 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar Section (Visible when NOT editing) */}
        {!isEditing && (
          <div className="space-y-3 animate-in fade-in duration-700">
            <div className="flex items-end justify-between text-[10px] font-bold uppercase tracking-widest">
              <div className="text-white/30 flex items-center gap-2">
                Progression <span className="text-white/60">{Math.floor(progress)}%</span>
                {nextTier && (
                  <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded-md border border-white/5">
                    Next: {nextTier.name}
                  </span>
                )}
              </div>
              {nextTier ? (
                <div className="text-white/40">
                  <span className="text-white font-black">{score}</span>
                  <span className="mx-1">/</span>
                  <span>{nextTier.minScore}</span>
                  <span className="ml-1 text-[8px]">Pts</span>
                </div>
              ) : (
                <div className="text-white/40">Max Rank Achieved</div>
              )}
            </div>

            <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                style={{
                  width: `${progress}%`,
                  backgroundColor: tier.color,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
