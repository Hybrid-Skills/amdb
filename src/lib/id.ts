import { customAlphabet } from 'nanoid';
// actually since I can't install nanoid, I'll use a vanilla implementation for now.
import { randomBytes } from 'crypto';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Generates a short, 8-character lowercase alphanumeric ID.
 * charset: 36 symbols, 8 positions = 36^8 = 2.8 trillion possible IDs.
 */
export function generateShortId(size: number = 8): string {
  const bytes = randomBytes(size);
  let id = '';
  for (let i = 0; i < size; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
