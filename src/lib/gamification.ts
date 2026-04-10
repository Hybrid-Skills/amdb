export interface Tier {
  level: number;
  name: string;
  emoji: string;
  color: string;
  minScore: number;
  glow?: boolean;
}

export const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4',
];

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
  awardId: string; // award that unlocks this emoji
}

// Each emoji is unlocked by a specific award. Some awards unlock 2 emojis.
export const AVATAR_EMOJIS: AvatarEmoji[] = [
  // Milestone
  { emoji: '🍿', awardId: 'first_step' },       // Add your first title
  { emoji: '⭐', awardId: 'enthusiast' },         // Score 5
  { emoji: '🎭', awardId: 'cinephile' },          // Score 20
  { emoji: '🌸', awardId: 'film_scholar' },       // Score 50
  { emoji: '🌟', awardId: 'auteur' },             // Score 100 (double: also 🎯)
  { emoji: '🎯', awardId: 'auteur' },             // Score 100 (double)
  { emoji: '💫', awardId: 'legendary' },          // Score 200 (double: also 👑)
  { emoji: '👑', awardId: 'legendary' },          // Score 200 (double)
  // Movies
  { emoji: '🎬', awardId: 'silver_screen' },     // First movie
  { emoji: '🎞️', awardId: 'movie_buff' },        // 10 movies
  { emoji: '📽️', awardId: 'film_fanatic' },      // 50 movies
  { emoji: '🦸', awardId: 'cineaste' },           // 100 movies
  // TV
  { emoji: '📺', awardId: 'pilot' },              // First TV show
  { emoji: '🎪', awardId: 'binge_watcher' },     // 10 TV shows
  { emoji: '🐺', awardId: 'series_stalker' },    // 50 TV shows
  // Anime
  { emoji: '🐉', awardId: 'otaku_initiate' },    // First anime
  { emoji: '🔥', awardId: 'otaku' },              // 5 anime
  { emoji: '🌊', awardId: 'weeb' },               // 20 anime
  { emoji: '🎮', awardId: 'anime_connoisseur' }, // 50 anime
  { emoji: '🧙', awardId: 'anime_legend' },      // 100 anime
  // Reviews
  { emoji: '🌙', awardId: 'first_opinion' },     // First review
  { emoji: '🦊', awardId: 'critic' },             // 10 reviews
  { emoji: '🦋', awardId: 'roger_ebert' },       // 50 reviews
  // Watch time
  { emoji: '🤖', awardId: 'weekend_warrior' },   // 24h watch time
  { emoji: '👾', awardId: 'screen_addict' },     // 100h watch time
  { emoji: '🦁', awardId: 'couch_legend' },      // 500h watch time
];
