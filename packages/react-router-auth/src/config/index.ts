export const AUTH_COOKIE_MAX_AGE_DAYS = 7;

interface WindowEnv {
  APP_NAME?: string;
}

/**
 * Narrowing type guard for the `env` object the host app injects onto
 * `window` at runtime. Avoids an unchecked `as unknown as` cast: we only
 * conclude `env` is present once we've verified it is a non-null object.
 */
const hasWindowEnv = (value: unknown): value is { env: WindowEnv } =>
  typeof value === 'object' &&
  value !== null &&
  'env' in value &&
  typeof value.env === 'object' &&
  value.env !== null;

// `window.env` is injected at runtime by the host app and may not exist yet
// (e.g. during module evaluation before hydration), so guard the access and
// fall back to `process.env.APP_NAME` / an empty string rather than throwing.
const APP_NAME =
  typeof window !== 'undefined' && hasWindowEnv(window)
    ? (window.env.APP_NAME ?? '')
    : ((typeof process !== 'undefined' ? process.env.APP_NAME : undefined) ??
      '');

// NOTE: We know this is setup but we don't need to import another package the env
export const AUTH_COOKIE_NAME = `${APP_NAME}_auth_token`;
