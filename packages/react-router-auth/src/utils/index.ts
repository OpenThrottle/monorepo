import { AUTH_COOKIE_MAX_AGE_DAYS, AUTH_COOKIE_NAME } from '../config/index';

/**
 * @description Options shared by the auth cookie header builders.
 */
export interface AuthCookieOptions {
  /**
   * When true, omit the `Secure` attribute so the cookie round-trips over
   * plain HTTP (local non-TLS dev). Defaults to false, i.e. `Secure` is set
   * outside of an explicit `NODE_ENV !== 'production'` dev environment.
   */
  insecureCookies?: boolean;
}

/**
 * @description Whether the `Secure` attribute should be omitted by default.
 * Local non-TLS dev runs with NODE_ENV !== 'production'.
 */
function isInsecureByDefault(): boolean {
  const nodeEnv =
    typeof process !== 'undefined' ? process.env.NODE_ENV : undefined;

  return nodeEnv !== 'production';
}

/**
 * @description Builds the shared cookie attribute string for the auth cookie,
 * so set and clear headers stay in sync. `Secure` is appended unless cookies
 * are explicitly marked insecure (local non-TLS dev).
 */
function buildAuthCookieAttributes(
  maxAge: number,
  options?: AuthCookieOptions,
): string {
  const insecure = options?.insecureCookies ?? isInsecureByDefault();
  const secure = insecure ? '' : '; Secure';

  return `Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

/**
 * @description Builds a Set-Cookie header value for the auth cookie.
 */
export function buildAuthCookie(
  token: string,
  options?: AuthCookieOptions,
): string {
  const maxAge = AUTH_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;

  return `${AUTH_COOKIE_NAME}=${token}; ${buildAuthCookieAttributes(maxAge, options)}`;
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
 * cookie (same path/attributes, Max-Age=0). Attributes must mirror
 * buildAuthCookie's for the clear to take effect.
 */
export function getClearAuthCookieHeader(options?: AuthCookieOptions): string {
  return `${AUTH_COOKIE_NAME}=; ${buildAuthCookieAttributes(0, options)}`;
}
