/** The OpenThrottle server the desktop app talks to until settings land. */
export const DEFAULT_OT_SERVER_URL = 'http://localhost:6021';

/** The developer Vite dev server `electron-vite dev` points the window at. */
export const DEFAULT_DEV_URL = 'http://localhost:6020';

/**
 * Env keys `getPublicEnv` requires that the shell does not derive from the
 * dynamic origin or the configured OT server. Desktop defaults only: real
 * values are never read from a `.env` file and nothing here is a secret.
 */
export const DESKTOP_ENV_DEFAULTS = {
  APP_ENV: 'production',
  APP_NAME: 'openthrottle-developer',
  APP_NAME_SHORT: 'Dev',
  APP_URL_ADMIN: 'http://localhost:6022',
  APP_URL_CMS: 'http://localhost:6023',
  APP_URL_WEBSITE: 'http://localhost:6025',
  APP_VERSION: 'desktop',
  ROLLBAR_TOKEN: 'desktop-no-rollbar',
} as const;

/** How long main waits for the child to report its port, then for the health probe. */
export const SERVER_START_TIMEOUT_MS = 30_000;

/** Path the child answers before and after the React Router handler is mounted. */
export const SHELL_HEALTH_PATH = '/__shell/health';

/** Browser-facing paths the child reverse-proxies to the OT server. */
export const PROXIED_PATHS = ['/graphql', '/health'] as const;
