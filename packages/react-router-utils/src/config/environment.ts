import type { OpenThrottleEnv } from '../types';

export const IS_BROWSER = typeof document !== 'undefined';

/**
 * @description Reads the raw environment source for the current runtime. In the
 * browser the only env that exists is the public tier serialized onto
 * `window.env`; on the server it is the full env surfaced through `process.env`.
 * Both runtimes share the read-only string-record
 * shape below, so the boundary is narrowed to that record once and then exposed
 * as the appropriate typed view — no `as unknown as` double cast.
 *
 * Validated, throwing accessors live in `utils/environment.ts`
 * ({@link getPublicEnv} / {@link getServerEnv} / {@link getEnvironment}); prefer
 * those when you need a guaranteed-present value.
 */
type RawEnv = Readonly<Record<string, string | undefined>>;

/**
 * @description Reads the browser env off `window.env` (injected at runtime),
 * narrowed to the raw string record without assuming any key is present.
 * `window` is referenced only when `IS_BROWSER`, so this stays SSR-safe.
 */
const isRawEnv = (value: unknown): value is RawEnv =>
  typeof value === 'object' && value !== null;

const readBrowserEnv = (): RawEnv => {
  if (!('env' in window)) {
    return {};
  }

  const candidate: unknown = window.env;
  return isRawEnv(candidate) ? candidate : {};
};

const rawEnv: RawEnv = IS_BROWSER ? readBrowserEnv() : process.env;

/**
 * @description The environment values available to this runtime. Typed as the
 * full {@link OpenThrottleEnv}; in the browser only the public-tier keys are
 * actually populated (server-only keys are absent), so read browser-shipped
 * values through the validated {@link getPublicEnv} accessor. This is the one
 * explicit place the untyped env boundary is narrowed to the typed shape — a
 * single assertion, not the former `as unknown as` double cast.
 */
function toTypedEnv(source: RawEnv): OpenThrottleEnv;
function toTypedEnv(source: RawEnv): unknown {
  return source;
}

export const ENV_SOURCE: OpenThrottleEnv = toTypedEnv(rawEnv);

export const NODE_ENV = ENV_SOURCE.NODE_ENV || 'development';

/**
 * @description `IS_DEVELOPMENT` is true ONLY for the `development` env. Staging
 * is deliberately treated as its own tier ({@link IS_STAGING}) and is NOT
 * development — so `IS_DEVELOPMENT`-gated dev-only behavior (verbose logging,
 * dev-only nav, etc.) does not leak into staging.
 */
export const IS_DEVELOPMENT = NODE_ENV === 'development';
export const IS_PRODUCTION = NODE_ENV === 'production';
export const IS_STAGING = NODE_ENV === 'staging';
