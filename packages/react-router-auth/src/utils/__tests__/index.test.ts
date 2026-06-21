// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';

// AUTH_COOKIE_NAME is computed from APP_NAME at import time, so set it first.
process.env.APP_NAME = 'test-app';

import {
  buildAuthCookie,
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
} from '../index';

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
});
