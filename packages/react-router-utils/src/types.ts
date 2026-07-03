/**
 * @description Server-only environment values. These MUST NOT be serialized into
 * the client (`window.env`): they describe internal topology or are otherwise
 * unsafe to expose to a browser. Read them only in server-side code (loaders,
 * actions, server entry points) via {@link getServerEnv}.
 */
export type OpenThrottleServerEnv = {
  // API endpoints
  /** Internal-only API origin used for server-side GraphQL. Never ship to the browser. */
  API_URL_INTERNAL: string;
};

/**
 * @description Public environment values. Safe to serialize into the client
 * (`window.env`) and read in browser code. Obtain via {@link getPublicEnv}.
 *
 * `ROLLBAR_TOKEN` is a client post (write-only) token and is intentionally
 * public so the browser can report errors.
 */
export type OpenThrottlePublicEnv = {
  // API endpoints
  API_URL_EXTERNAL: string;

  // This application
  /**
   * Application-level environment label.
   *
   * NOTE: `NODE_ENV` is the authoritative source for runtime-tier decisions —
   * the derived flags `IS_DEVELOPMENT` / `IS_STAGING` / `IS_PRODUCTION` (see
   * `config/environment.ts`) are computed from `NODE_ENV`, not `APP_ENV`.
   * `APP_ENV` exists only as a human-facing display/diagnostics label (e.g.
   * the settings env panel) and should mirror `NODE_ENV`; do not branch runtime
   * behavior on it. The two carry the same union to stay in sync.
   */
  APP_ENV: 'development' | 'production' | 'staging' | 'test';
  APP_NAME: string;
  APP_NAME_SHORT: string;
  APP_URL: string;
  // Sibling applications
  APP_URL_ADMIN: string;

  APP_URL_CMS: string;
  APP_URL_DEVELOPER: string;
  APP_URL_EMAIL: string;
  APP_URL_SERVER: string;
  APP_URL_WEBSITE: string;
  APP_VERSION: string;

  // Environment
  /** Feature flag (string-encoded boolean; see config/features.ts). */
  FEATURE_BETA_PREVIEW?: string;

  /**
   * Authoritative runtime environment tier. The `IS_DEVELOPMENT` /
   * `IS_STAGING` / `IS_PRODUCTION` flags in `config/environment.ts` derive from
   * this value (not from {@link OpenThrottlePublicEnv.APP_ENV}).
   */
  NODE_ENV: 'development' | 'production' | 'staging' | 'test';
  ROLLBAR_TOKEN: string;
};

/**
 * @description Full environment available server-side: the union of the public
 * tier ({@link OpenThrottlePublicEnv}) and the server-only tier
 * ({@link OpenThrottleServerEnv}). Obtain via {@link getEnvironment}.
 */
export type OpenThrottleEnv = OpenThrottlePublicEnv & OpenThrottleServerEnv;

export type OpenThrottleWindow = typeof window &
  typeof globalThis & {
    env: OpenThrottleClientEnv;
  };

/**
 * @description Shape of the client `window.env` object. Only the public tier is
 * safe to serialize, so this is an alias for {@link OpenThrottlePublicEnv}.
 */
export type OpenThrottleClientEnv = OpenThrottlePublicEnv;
