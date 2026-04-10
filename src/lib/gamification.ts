export interface Tier {
  level: number;
  name: string;
  emoji: string;
  color: string;
  minScore: number;
  glow?: boolean;
}

export const TIERS: Tier[] = [
  { level: 1, name: 'Casual Viewer', emoji: '🍿', color: '#6b7280', minScore: 0 },
  { level: 2, name: 'Enthusiast',    emoji: '🎬', color: '#3b82f6', minScore: 5 },
  { level: 3, name: 'Cinephile',     emoji: '🎭', color: '#8b5cf6', minScore: 20 },
  { level: 4, name: 'Film Scholar',  emoji: '🏆', color: '#f59e0b', minScore: 50 },
  { level: 5, name: 'Auteur',        emoji: '🌟', color: '#ec4899', minScore: 100 },
  { level: 6, name: 'Legendary',     emoji: '👑', color: '#06b6d4', minScore: 200, glow: true },
];

export function getTier(score: number): Tier {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (score >= TIERS[i].minScore) return TIERS[i];
  }
  return TIERS[0];
}

export function getNextTier(current: Tier): Tier | null {
  return TIERS.find((t) => t.level === current.level + 1) ?? null;
}

export interface AvatarEmoji {
  emoji: string;
  requiredTier: number;
}

export const AVATAR_EMOJIS: AvatarEmoji[] = [
  // Tier 1 — free
  { emoji: '🍿', requiredTier: 1 },
  { emoji: '🎬', requiredTier: 1 },
  { emoji: '📽️', requiredTier: 1 },
  { emoji: '🎞️', requiredTier: 1 },
  { emoji: '⭐', requiredTier: 1 },
  { emoji: '🌙', requiredTier: 1 },
  // Tier 2
  { emoji: '🎭', requiredTier: 2 },
  { emoji: '🎪', requiredTier: 2 },
  { emoji: '🔥', requiredTier: 2 },
  { emoji: '🌊', requiredTier: 2 },
  { emoji: '🦊', requiredTier: 2 },
  { emoji: '🐺', requiredTier: 2 },
  // Tier 3
  { emoji: '🐉', requiredTier: 3 },
  { emoji: '🧙', requiredTier: 3 },
  { emoji: '🤖', requiredTier: 3 },
  { emoji: '👾', requiredTier: 3 },
  { emoji: '🌸', requiredTier: 3 },
  { emoji: '🦋', requiredTier: 3 },
  // Tier 4
  { emoji: '🦸', requiredTier: 4 },
  { emoji: '🎮', requiredTier: 4 },
  { emoji: '🐙', requiredTier: 4 },
  { emoji: '🦁', requiredTier: 4 },
  // Tier 5
  { emoji: '🌟', requiredTier: 5 },
  { emoji: '💫', requiredTier: 5 },
  { emoji: '🎯', requiredTier: 5 },
  // Tier 6
  { emoji: '👑', requiredTier: 6 },
];
