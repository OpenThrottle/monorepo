/** Where `package` leaves the arm64 bundle, relative to the project root. */
export const PACKAGED_APP_PATH = 'dist/release/mac-arm64/OpenThrottle.app';

/** The main executable inside an `.app` bundle. */
export const APP_EXECUTABLE = 'Contents/MacOS/OpenThrottle';

/**
 * The line `src/server/server-entry.ts` writes to stderr once the embedded
 * server has bound its ephemeral port. Group 1 is the origin.
 */
export const LISTENING_LINE_PATTERN =
  /\[openthrottle-server\] listening on (http:\/\/127\.0\.0\.1:\d+)/u;

/** Budgets for one smoke run, in milliseconds. */
export const SMOKE_TIMEOUTS = {
  /** From spawn until the listening line appears. */
  boot: 60_000,
  /** From the listening line until `/__shell/health` answers `ok`. */
  health: 60_000,
  /** Delay between health polls. */
  healthInterval: 500,
  /** One HTTP request. */
  request: 10_000,
  /** From SIGTERM until the app must have exited, before SIGKILL. */
  shutdown: 10_000,
} as const;

/**
 * What the stub OT server answers to the `serverHealth` probe. Main probes the
 * configured server before it starts the embedded child, so a smoke run needs
 * an OT server; this stub stands in for one, so no Postgres or Redis is needed.
 */
export const STUB_SERVER_HEALTH = {
  api: 'ok',
  database: 'ok',
  redis: 'ok',
  websocket: 'ok',
} as const;
