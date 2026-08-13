import type {
  OpenThrottleClientEnv,
  OpenThrottleEnv,
} from '@openthrottle/react-router-utils';

declare global {
  /**
   * Mirrors each app's app/types/global.d.ts so installTestEnv can assign
   * window.env without a cast. Declaration-merges with the apps' own (identical)
   * augmentation when this package is consumed.
   */
  interface Window {
    env: OpenThrottleClientEnv;
  }
}

/**
 * Realistic localhost test defaults for the full {@link OpenThrottleEnv} shape,
 * matching the ports the apps run on (API on :6021, sibling apps on 6022–6027).
 *
 * These are the single source of truth for the test env. Every key is present
 * and non-empty because `getEnvironment()` throws on a missing key, and the
 * values are realistic (not sentinels) so tests that assert on constructed URLs
 * keep working. Per-app differences (notably `APP_NAME`) come in via overrides.
 */
const DEFAULT_TEST_ENV: Required<OpenThrottleEnv> = {
  API_URL_EXTERNAL: 'http://localhost:6021',
  API_URL_INTERNAL: 'http://localhost:6021',
  APP_ENV: 'test',
  APP_NAME: 'openthrottle',
  APP_NAME_SHORT: 'OT',
  APP_URL: 'http://localhost',
  APP_URL_ADMIN: 'http://localhost:6022',
  APP_URL_CMS: 'http://localhost:6023',
  APP_URL_DEVELOPER: 'http://localhost:6024',
  APP_URL_EMAIL: 'http://localhost:6025',
  APP_URL_SERVER: 'http://localhost:6026',
  APP_URL_WEBSITE: 'http://localhost:6027',
  APP_VERSION: '1.0.0',

  /**
   * Optional in OpenThrottleEnv, but pinned here via Required<> so the fixture
   * is exhaustive: adding a key to the type — required or optional — now breaks
   * this object literal at compile time (missing key), instead of silently
   * drifting from the type and surfacing as a `getEnvironment()` throw in
   * consumers. The runtime length assertion in env.test.ts backstops the count.
   */
  FEATURE_BETA_PREVIEW: 'false',
  FEATURE_CHARLIE_PREVIEW: 'false',

  NODE_ENV: 'test',
  ROLLBAR_TOKEN: 'xxxxxxxxxxxxxxxx',
  // Empty = not running on Vercel (the self-hosted default); Vercel sets '1'.
  VERCEL: '',
};

/**
 * Build the full {@link OpenThrottleEnv} test fixture, merging `overrides` over
 * the realistic localhost defaults. All keys are guaranteed present/non-empty.
 *
 * @public
 */
export const createTestEnv = (
  overrides: Partial<OpenThrottleEnv> = {},
): OpenThrottleEnv => ({
  ...DEFAULT_TEST_ENV,
  ...overrides,
});

/**
 * Assign the test env fixture onto `window.env` (the contract
 * `getEnvironment()` reads in jsdom). No-op outside a browser-like environment.
 *
 * When there is no `window`, this is almost always a misconfigured suite — the
 * Vitest `test.environment` was not set to `jsdom` — so we surface a one-line
 * warning. Without it the caller gets an empty `window.env` and a confusing
 * downstream `getEnvironment()` failure instead of an actionable hint.
 *
 * @public
 */
export const installTestEnv = (
  overrides: Partial<OpenThrottleEnv> = {},
): void => {
  if (typeof window === 'undefined') {
    const message = `installTestEnv() called outside a jsdom environment — window is undefined, so window.env was not set. Set Vitest test.environment='jsdom' for this suite.`;
    console.warn(message);

    return;
  }

  window.env = createTestEnv(overrides);
};
