import { afterEach, describe, expect, test, vi } from 'vitest';
import type { OpenThrottleEnv, OpenThrottlePublicEnv } from '../../types';

const VALID_ENV: Record<string, number | string> = {
  API_URL_EXTERNAL: 'https://api.example.com',
  API_URL_INTERNAL: 'http://api.internal',
  APP_ENV: 'development',
  APP_NAME: 'OpenThrottle',
  APP_NAME_SHORT: 'OT',
  APP_URL: 'https://example.com',
  APP_URL_ADMIN: 'https://admin.example.com',
  APP_URL_CMS: 'https://cms.example.com',
  APP_URL_DEVELOPER: 'https://dev.example.com',
  APP_URL_EMAIL: 'https://email.example.com',
  APP_URL_SERVER: 'https://server.example.com',
  APP_URL_WEBSITE: 'https://www.example.com',
  APP_VERSION: 42,
  FEATURE_BETA_PREVIEW: 'false',
  NODE_ENV: 'development',
  ROLLBAR_TOKEN: 1234567890,
};

const REQUIRED_KEYS = [
  'API_URL_EXTERNAL',
  'API_URL_INTERNAL',
  'APP_ENV',
  'APP_NAME',
  'APP_NAME_SHORT',
  'APP_URL',
  'APP_URL_ADMIN',
  'APP_URL_CMS',
  'APP_URL_DEVELOPER',
  'APP_URL_EMAIL',
  'APP_URL_SERVER',
  'APP_URL_WEBSITE',
  'APP_VERSION',
  'NODE_ENV',
  'ROLLBAR_TOKEN',
] as const;

const loadGetEnvironment = async (
  env: Record<string, unknown>,
): Promise<() => OpenThrottleEnv> => {
  vi.resetModules();
  vi.stubGlobal('window', { env });
  const mod = await import('../environment');
  return mod.getEnvironment;
};

const loadGetPublicEnv = async (
  env: Record<string, unknown>,
): Promise<() => OpenThrottlePublicEnv> => {
  vi.resetModules();
  vi.stubGlobal('window', { env });
  const mod = await import('../environment');
  return mod.getPublicEnv;
};

const withoutKey = (key: string): Record<string, unknown> => {
  const env: Record<string, unknown> = {};
  for (const [k, value] of Object.entries(VALID_ENV)) {
    if (k !== key) {
      env[k] = value;
    }
  }
  return env;
};

describe('getEnvironment', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('returns a fully-populated env, coercing version and token to strings', async () => {
    const getEnvironment = await loadGetEnvironment(VALID_ENV);

    expect(getEnvironment()).toEqual({
      API_URL_EXTERNAL: 'https://api.example.com',
      API_URL_INTERNAL: 'http://api.internal',
      APP_ENV: 'development',
      APP_NAME: 'OpenThrottle',
      APP_NAME_SHORT: 'OT',
      APP_URL: 'https://example.com',
      APP_URL_ADMIN: 'https://admin.example.com',
      APP_URL_CMS: 'https://cms.example.com',
      APP_URL_DEVELOPER: 'https://dev.example.com',
      APP_URL_EMAIL: 'https://email.example.com',
      APP_URL_SERVER: 'https://server.example.com',
      APP_URL_WEBSITE: 'https://www.example.com',
      APP_VERSION: '42',
      FEATURE_BETA_PREVIEW: 'false',
      FEATURE_CHARLIE_PREVIEW: 'false',
      NODE_ENV: 'development',
      ROLLBAR_TOKEN: '1234567890',
    });
  });

  test.each(REQUIRED_KEYS)('throws when %s is not set', async (key) => {
    const getEnvironment = await loadGetEnvironment(withoutKey(key));

    expect(() => getEnvironment()).toThrow(`${key} is not set`);
  });
});

describe('getPublicEnv', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  test('does NOT leak the server-only API_URL_INTERNAL into the public tier', async () => {
    // VALID_ENV deliberately carries the server-only API_URL_INTERNAL key. The
    // public tier is what gets serialized onto window.env, so it must never
    // surface server-only topology. This locks in the public/server tiering.
    const getPublicEnv = await loadGetPublicEnv(VALID_ENV);

    const publicEnv = getPublicEnv();

    expect(publicEnv).not.toHaveProperty('API_URL_INTERNAL');
    expect(Object.values(publicEnv)).not.toContain('http://api.internal');
  });

  test('requires only the public tier (succeeds without API_URL_INTERNAL)', async () => {
    // The browser never has the server-only key, so the public accessor must
    // resolve fully without it.
    const getPublicEnv = await loadGetPublicEnv(withoutKey('API_URL_INTERNAL'));

    expect(() => getPublicEnv()).not.toThrow();
    expect(getPublicEnv()).not.toHaveProperty('API_URL_INTERNAL');
  });
});
