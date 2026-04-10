'use client';

import * as React from 'react';
import { AVATAR_EMOJIS, type Tier } from '@/lib/gamification';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

interface AvatarDisplayProps {
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  size?: 'sm' | 'lg';
}

export function AvatarDisplay({ name, avatarColor, avatarEmoji, size = 'lg' }: AvatarDisplayProps) {
  const dim = size === 'lg' ? 'w-20 h-20 text-4xl' : 'w-9 h-9 text-base';
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-black text-white shrink-0`}
      style={{ backgroundColor: avatarColor }}
    >
      {avatarEmoji ?? name.charAt(0).toUpperCase()}
    </div>
  );
}

interface AvatarEditorProps {
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  userTier: Tier;
  profileId: string;
  onUpdate: (color: string, emoji: string | null) => void;
}

export function AvatarEditor({ name, avatarColor, avatarEmoji, userTier, profileId, onUpdate }: AvatarEditorProps) {
  const [open, setOpen] = React.useState(false);
  const [localColor, setLocalColor] = React.useState(avatarColor);
  const [localEmoji, setLocalEmoji] = React.useState<string | null>(avatarEmoji);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  async function handleColorSelect(color: string) {
    setLocalColor(color);
    onUpdate(color, localEmoji); // optimistic
    try {
      await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarColor: color }),
      });
    } catch {
      setLocalColor(avatarColor);
      onUpdate(avatarColor, localEmoji);
    }
  }

  async function handleEmojiSelect(emoji: string) {
    setLocalEmoji(emoji);
    onUpdate(localColor, emoji); // optimistic
    try {
      await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarEmoji: emoji }),
      });
    } catch {
      setLocalEmoji(avatarEmoji);
      onUpdate(localColor, avatarEmoji);
    }
  }

  async function handleClearEmoji() {
    setLocalEmoji(null);
    onUpdate(localColor, null);
    try {
      await fetch(`/api/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarEmoji: null }),
      });
    } catch {
      setLocalEmoji(avatarEmoji);
      onUpdate(localColor, avatarEmoji);
    }
  }

  const inner = (
    <div className="p-4 space-y-5">
      {/* Preview */}
      <div className="flex items-center justify-center py-2">
        <AvatarDisplay name={name} avatarColor={localColor} avatarEmoji={localEmoji} size="lg" />
      </div>

      {/* Emoji grid */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Choose Avatar</p>
        <div className="grid grid-cols-6 gap-2">
          {AVATAR_EMOJIS.map(({ emoji, requiredTier }) => {
            const locked = requiredTier > userTier.level;
            const lockTierName = locked
              ? `Unlocks at ${['', 'Casual Viewer', 'Enthusiast', 'Cinephile', 'Film Scholar', 'Auteur', 'Legendary'][requiredTier]} (score ${[0, 0, 5, 20, 50, 100, 200][requiredTier]}+)`
              : undefined;
            return (
              <button
                key={emoji}
                disabled={locked}
                title={lockTierName}
                onClick={() => !locked && handleEmojiSelect(emoji)}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all
                  ${locked ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
                  ${localEmoji === emoji ? 'bg-white/15 ring-2 ring-white/40' : ''}
                `}
              >
                {emoji}
                {locked && (
                  <span className="absolute -top-1 -right-1 text-[10px]">🔒</span>
                )}
              </button>
            );
          })}
        </div>
        {localEmoji && (
          <button
            onClick={handleClearEmoji}
            className="mt-2 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Use initial letter instead
          </button>
        )}
      </div>

      {/* Color swatches */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">Background Color</p>
        <div className="flex gap-3 flex-wrap">
          {AVATAR_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleColorSelect(color)}
              className={`w-8 h-8 rounded-full transition-all ${localColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110' : 'hover:scale-105'}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative group">
        <AvatarDisplay name={name} avatarColor={localColor} avatarEmoji={localEmoji} size="lg" />
        <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-xs font-bold">Edit</span>
        </div>
      </button>

      {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-sm bg-zinc-950 border-white/10 text-white p-0 overflow-hidden [&>button]:hidden">
            <DialogTitle className="sr-only">Edit Avatar</DialogTitle>
            {inner}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="bg-zinc-950 border-white/10 text-white">
            <DrawerTitle className="sr-only">Edit Avatar</DrawerTitle>
            {inner}
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
