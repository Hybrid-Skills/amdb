import { randomBytes } from 'crypto';

// Base62: digits + lowercase + uppercase = 62 symbols
// 8 positions → 62^8 ≈ 218 trillion possible IDs (vs 36^8 = 2.8 trillion with base36)
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates a short, 8-character case-sensitive alphanumeric ID (base62).
 */
export function generateShortId(size: number = 8): string {
  const bytes = randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
