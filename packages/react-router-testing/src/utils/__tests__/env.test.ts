import { afterEach, describe, expect, test, vi } from 'vitest';
import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';
import { createTestEnv, installTestEnv } from '../env';

// Compile-time contract: the set of keys the fixture must contain, derived from
// the type rather than hardcoded. This map has one boolean per key of
// Required<OpenThrottleEnv>; if a key is added to OpenThrottleEnv (required or
// optional) this object literal fails to compile (missing key) — pinning the
// runtime length assertion below to the type so the magic number can't drift
// silently from OpenThrottleEnv and throw in consumers' getEnvironment().
const EXPECTED_ENV_KEYS = {
  API_URL_EXTERNAL: true,
  API_URL_INTERNAL: true,
  APP_ENV: true,
  APP_NAME: true,
  APP_NAME_SHORT: true,
  APP_URL: true,
  APP_URL_ADMIN: true,
  APP_URL_CMS: true,
  APP_URL_DEVELOPER: true,
  APP_URL_EMAIL: true,
  APP_URL_SERVER: true,
  APP_URL_WEBSITE: true,
  APP_VERSION: true,
  FEATURE_BETA_PREVIEW: true,
  FEATURE_CHARLIE_PREVIEW: true,
  NODE_ENV: true,
  ROLLBAR_TOKEN: true,
  VERCEL: true,
} satisfies Record<keyof Required<OpenThrottleEnv>, true>;

// Keys allowed to be empty in a realistic env. VERCEL is a platform marker that
// getPublicEnv() defaults to '' off-Vercel (it never throws on absence), so —
// unlike every other key — an empty value is the correct self-hosted default.
const MAY_BE_EMPTY_KEYS = new Set<string>(['VERCEL']);

describe('createTestEnv', () => {
  test('returns the full env with realistic localhost defaults', () => {
    const env = createTestEnv();

    expect(env.API_URL_EXTERNAL).toBe('http://localhost:6021');
    expect(env.API_URL_INTERNAL).toBe('http://localhost:6021');
    expect(env.APP_URL_WEBSITE).toBe('http://localhost:6027');
    expect(env.APP_ENV).toBe('test');
    expect(env.NODE_ENV).toBe('test');
  });

  test('every key is present and non-empty (satisfies getEnvironment())', () => {
    const env = createTestEnv();

    // Count is derived from the type-checked key map, not a magic number, so
    // adding a key to OpenThrottleEnv breaks EXPECTED_ENV_KEYS at compile time
    // before this runtime assertion can drift.
    const expectedKeys = Object.keys(EXPECTED_ENV_KEYS).sort();
    expect(Object.keys(env).sort()).toEqual(expectedKeys);
    for (const [key, value] of Object.entries(env)) {
      if (MAY_BE_EMPTY_KEYS.has(key)) {
        continue;
      }
      expect(value).toBeTruthy();
    }
  });

  test('merges overrides over the defaults without dropping other keys', () => {
    const env = createTestEnv({ APP_NAME: 'openthrottle-admin' });

    expect(env.APP_NAME).toBe('openthrottle-admin');
    expect(env.APP_NAME_SHORT).toBe('OT');
    expect(env.API_URL_EXTERNAL).toBe('http://localhost:6021');
  });
});

describe('installTestEnv', () => {
  test('populates window.env from the fixture', () => {
    installTestEnv();

    expect(window.env.APP_ENV).toBe('test');
    // window.env is the public tier (OpenThrottleClientEnv); the server-only
    // API_URL_INTERNAL is intentionally not exposed there — assert the public
    // API_URL_EXTERNAL instead.
    expect(window.env.API_URL_EXTERNAL).toBe('http://localhost:6021');
  });

  test('applies overrides onto window.env', () => {
    installTestEnv({ APP_NAME: 'openthrottle-website' });

    expect(window.env.APP_NAME).toBe('openthrottle-website');
  });

  test('warns and no-ops when window is undefined (non-jsdom suite)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('window', undefined);

    installTestEnv();

    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("test.environment='jsdom'");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
