'use client';

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
