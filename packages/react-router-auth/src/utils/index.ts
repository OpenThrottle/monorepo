import {
  AUTH_COOKIE_MAX_AGE_DAYS,
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_PATH,
  AUTH_COOKIE_SAME_SITE,
} from '../config/index';

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
  /**
   * Override the cookie lifetime in days. Defaults to
   * `AUTH_COOKIE_MAX_AGE_DAYS`. Extension point for an app that needs a
   * non-default session length without forking the shared helper.
   */
  maxAgeDays?: number;
  /**
   * Override the cookie `Path` attribute. Defaults to `AUTH_COOKIE_PATH`
   * (`/`). Extension point for per-app divergence.
   */
  path?: string;
  /**
   * Override the cookie `SameSite` attribute. Defaults to
   * `AUTH_COOKIE_SAME_SITE` (`Lax`). Extension point for an app that needs
   * `Strict`.
   */
  sameSite?: string;
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
  const path = options?.path ?? AUTH_COOKIE_PATH;
  const sameSite = options?.sameSite ?? AUTH_COOKIE_SAME_SITE;

  return `Path=${path}; HttpOnly; SameSite=${sameSite}${secure}; Max-Age=${maxAge}`;
}

/**
 * @description Builds a Set-Cookie header value for the auth cookie.
 *
 * Contract: `token` MUST be a server-issued JWT (base64url segments joined by
 * `.`), whose characters are all cookie-value-safe. The value is interpolated
 * verbatim and NOT percent-encoded, so passing a token containing `;`, `,`,
 * whitespace, or other separators would silently corrupt the Set-Cookie
 * header. Callers must not pass arbitrary strings.
 */
export function buildAuthCookie(
  token: string,
  options?: AuthCookieOptions,
): string {
  const maxAge =
    (options?.maxAgeDays ?? AUTH_COOKIE_MAX_AGE_DAYS) * 24 * 60 * 60;

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
      const value = valueParts.join('=').trim();

      // An effectively-empty value (`name=` or `name= `) is not a real token;
      // return null to match the documented `string | null` intent rather
      // than handing back an empty string.
      return value === '' ? null : value;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * @description Cheap pre-flight check: true when a JWT's `exp` claim is in the
 * past, or the token is structurally unparseable. The signature is NOT verified
 * (the API still verifies it on every request) — this only lets the auth
 * middleware redirect an expired session to login instead of letting loaders
 * fire authenticated requests that 401 (which, in a deferred loader, surface as
 * an unhandled rejection and crash the SSR server). A token with no `exp` claim
 * is treated as non-expiring here and deferred to the API.
 */
export function isJwtExpired(token: string): boolean {
  const parts = token.split('.');

  if (parts.length !== 3 || parts[1] === undefined) {
    return true;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return true;
  }

  if (!isRecord(payload) || typeof payload.exp !== 'number') {
    return false;
  }

  return payload.exp <= Math.floor(Date.now() / 1000);
}
