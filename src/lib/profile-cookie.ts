const COOKIE_NAME = 'amdb_profile';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export interface ProfileCookieData {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji?: string | null;
  isDefault: boolean;
}

export function readProfileCookie(): ProfileCookieData | null {
  if (typeof document === 'undefined') return null;
  try {
    const raw = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      ?.split('=')
      .slice(1)
      .join('=');
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    return null;
  }
}

export function writeProfileCookie(p: ProfileCookieData) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    JSON.stringify({ id: p.id, name: p.name, avatarColor: p.avatarColor, avatarEmoji: p.avatarEmoji ?? null, isDefault: p.isDefault }),
  )}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearProfileCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}
