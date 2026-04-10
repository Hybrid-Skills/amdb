// Deprecated: Profile cookies are no longer used.
// User identity is now stored directly on the User model and exposed via NextAuth session.
// This file is kept as a stub to avoid breaking imports during the migration.

export interface ProfileCookieData {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji?: string | null;
  isDefault: boolean;
}

export function readProfileCookie(): ProfileCookieData | null {
  return null;
}

export function writeProfileCookie(_p: ProfileCookieData) {
  // no-op
}

export function clearProfileCookie() {
  // no-op
}
