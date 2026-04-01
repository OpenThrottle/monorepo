import { AUTH_COOKIE_MAX_AGE_DAYS, AUTH_COOKIE_NAME } from '../config/index';

/**
 * @description Builds a Set-Cookie header value for the auth cookie.
 */
export function buildAuthCookie(token: string): string {
  const maxAge = AUTH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

  return `${AUTH_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * @description Reads the auth JWT from a Cookie header string (e.g. request.headers.get('cookie')).
 */
export function getAuthTokenFromCookie(cookieHeader: string): string | null {
  const parts = cookieHeader.split(';').map((s) => s.trim());

  for (const part of parts) {
    const [name, ...valueParts] = part.split('=');

    if (name?.trim() === AUTH_COOKIE_NAME && valueParts.length > 0) {
      return valueParts.join('=').trim();
    }
  }

  return null;
}

/**
 * @description Returns a Set-Cookie header value that clears the auth
 * cookie (same path/attributes, Max-Age=0).
 */
export function getClearAuthCookieHeader(): string {
  return `${AUTH_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
