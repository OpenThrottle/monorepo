// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

// AUTH_COOKIE_NAME is computed from APP_NAME at import time, so set it first.
process.env.APP_NAME = 'test-app';

import { AUTH_COOKIE_NAME } from '../../config/index';
import {
  buildAuthCookie,
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
  isJwtExpired,
} from '../index';

/** Build a JWT with the given payload (header + signature are dummies). */
const makeJwt = (payload: Record<string, unknown>): string => {
  const seg = (value: unknown): string =>
    Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${seg({ alg: 'HS256', typ: 'JWT' })}.${seg(payload)}.sig`;
};

describe('auth cookie header builders', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('omits Secure when cookies are explicitly insecure', () => {
    const header = buildAuthCookie('jwt', { insecureCookies: true });

    expect(header).toContain('_auth_token=jwt');
    expect(header).toContain('HttpOnly');
    expect(header).toContain('SameSite=Lax');
    expect(header).not.toContain('Secure');
  });

  it('sets Secure when cookies are not marked insecure', () => {
    const header = buildAuthCookie('jwt', { insecureCookies: false });

    expect(header).toContain('; Secure');
  });

  it('sets Secure by default in production', () => {
    process.env.NODE_ENV = 'production';

    expect(buildAuthCookie('jwt')).toContain('; Secure');
  });

  it('omits Secure by default outside production (local http dev)', () => {
    process.env.NODE_ENV = 'development';

    expect(buildAuthCookie('jwt')).not.toContain('Secure');
  });

  it('mirrors attributes between set and clear (Secure)', () => {
    expect(getClearAuthCookieHeader({ insecureCookies: false })).toContain(
      '; Secure',
    );
    expect(getClearAuthCookieHeader({ insecureCookies: true })).not.toContain(
      'Secure',
    );
    expect(getClearAuthCookieHeader({ insecureCookies: true })).toContain(
      'Max-Age=0',
    );
  });

  it('round-trips a token through set then read', () => {
    const header = buildAuthCookie('abc.def.ghi', { insecureCookies: true });
    const cookieHeader = header.split(';')[0];

    expect(getAuthTokenFromCookie(cookieHeader)).toBe('abc.def.ghi');
  });

  it('uses default Path, SameSite, and Max-Age when no overrides given', () => {
    const header = buildAuthCookie('jwt', { insecureCookies: true });

    expect(header).toContain('Path=/');
    expect(header).toContain('SameSite=Lax');
    expect(header).toContain(`Max-Age=${7 * 24 * 60 * 60}`);
  });

  it('honors path, sameSite, and maxAgeDays overrides', () => {
    const header = buildAuthCookie('jwt', {
      insecureCookies: true,
      maxAgeDays: 1,
      path: '/app',
      sameSite: 'Strict',
    });

    expect(header).toContain('Path=/app');
    expect(header).toContain('SameSite=Strict');
    expect(header).toContain(`Max-Age=${24 * 60 * 60}`);
  });

  it('returns null for an empty cookie value', () => {
    expect(getAuthTokenFromCookie('test-app_auth_token=')).toBeNull();
  });

  it('returns null for a whitespace-only cookie value', () => {
    expect(getAuthTokenFromCookie('test-app_auth_token= ')).toBeNull();
  });

  it('returns null when the auth cookie is absent', () => {
    expect(getAuthTokenFromCookie('other=value')).toBeNull();
  });

  it('returns null for an empty cookie header', () => {
    expect(getAuthTokenFromCookie('')).toBeNull();
  });

  it('finds the auth cookie among multiple cookies', () => {
    expect(
      getAuthTokenFromCookie(`foo=1; ${AUTH_COOKIE_NAME}=jwt; bar=2`),
    ).toBe('jwt');
  });

  it('preserves `=` characters inside the token value (JWT segments)', () => {
    const jwt = 'header.payload.signature==';

    expect(getAuthTokenFromCookie(`${AUTH_COOKIE_NAME}=${jwt}`)).toBe(jwt);
  });

  it('trims surrounding whitespace from the cookie value', () => {
    expect(getAuthTokenFromCookie(`${AUTH_COOKIE_NAME}=  jwt  `)).toBe('jwt');
  });
});

describe('isJwtExpired', () => {
  const nowSeconds = Math.floor(Date.now() / 1000);

  it('returns false for a token whose exp is in the future', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSeconds + 3600 }))).toBe(false);
  });

  it('returns true for a token whose exp is in the past', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSeconds - 60 }))).toBe(true);
  });

  it('treats exp exactly at now as expired', () => {
    expect(isJwtExpired(makeJwt({ exp: nowSeconds }))).toBe(true);
  });

  it('treats a token without an exp claim as non-expiring (defers to API)', () => {
    expect(isJwtExpired(makeJwt({ sub: 'user-1' }))).toBe(false);
  });

  it('treats a structurally invalid token as expired', () => {
    expect(isJwtExpired('not-a-jwt')).toBe(true);
    expect(isJwtExpired('only.two')).toBe(true);
    expect(isJwtExpired('a.!!!notbase64json!!!.c')).toBe(true);
  });
});
