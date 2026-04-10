'use client';

import { AvatarDisplay } from './avatar-editor';

interface Profile {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string | null;
  isDefault: boolean;
}

interface ProfileSwitcherBarProps {
  profiles: Profile[];
  activeId: string;
  onSwitch: (profile: Profile) => void;
}

export function ProfileSwitcherBar({ profiles, activeId, onSwitch }: ProfileSwitcherBarProps) {
  if (profiles.length <= 1) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
      {profiles.map((p) => (
        <button
          key={p.id}
          onClick={() => onSwitch(p)}
          className={`flex flex-col items-center gap-1.5 shrink-0 transition-opacity ${p.id === activeId ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
        >
          <div className={`rounded-full transition-all ${p.id === activeId ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}>
            <AvatarDisplay name={p.name} avatarColor={p.avatarColor} avatarEmoji={p.avatarEmoji} size="sm" />
          </div>
          <span className="text-[11px] font-medium text-white/70 max-w-[56px] truncate">{p.name}</span>
        </button>
      ))}
    </div>
  );
}
