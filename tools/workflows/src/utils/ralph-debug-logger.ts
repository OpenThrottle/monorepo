/**
 * @description Opt-in debug logging for Ralph / workflow-ralph. When disabled, {@link ralphDebugLogger} methods are no-ops (no branches in hot paths beyond one indirect call). Enable with {@link RALPH_DEBUG_ENV} or {@link RALPH_DEBUG_ENV_LEGACY}; verbose lines with {@link RALPH_VERBOSE_ENV} or `WORKFLOW_RALPH_DEBUG=verbose`.
 */

/** Primary env var for Ralph workflow debug output (stderr). */
export const RALPH_DEBUG_ENV = 'WORKFLOW_RALPH_DEBUG' as const;

/** Legacy alias for {@link RALPH_DEBUG_ENV}. */
export const RALPH_DEBUG_ENV_LEGACY = 'RALPH_DEBUG' as const;

/** When set, enables the noisiest {@link RalphDebugLogger.verbose} lines (also accepts `WORKFLOW_RALPH_DEBUG=2|verbose`). */
export const RALPH_VERBOSE_ENV = 'WORKFLOW_RALPH_VERBOSE' as const;

/** Prefix on every stderr debug line for grep-friendly logs. */
export const RALPH_DEBUG_LOG_PREFIX = '[workflow-ralph:debug]' as const;

const VERBOSE_LABEL = '[verbose]' as const;

export type RalphDebugLevel = 'off' | 'debug' | 'verbose';

export interface RalphDebugLogger {
  readonly enabled: boolean;
  readonly level: RalphDebugLevel;
  /**
   * @description High-signal messages (phases, buffer sizes, parse outcomes). Enabled for `debug` and `verbose` levels.
   */
  debug: (...args: readonly unknown[]) => void;
  /**
   * @description Extra detail (e.g. tight loops). Enabled only for `verbose` level.
   */
  verbose: (...args: readonly unknown[]) => void;
}

/**
 * @description No-op used when debug is off; safe to pass where a `void`-returning callback is expected.
 */
export const noop = (): void => {};

/**
 * @description Reads debug level from `env` (defaults to `process.env`). Pure for tests.
 */
export function readRalphDebugConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): RalphDebugLevel {
  const verboseRaw = env[RALPH_VERBOSE_ENV];
  if (isVerboseTruthy(verboseRaw)) {
    return 'verbose';
  }

  const raw = env[RALPH_DEBUG_ENV] ?? env[RALPH_DEBUG_ENV_LEGACY];
  if (raw === undefined || raw === '') {
    return 'off';
  }

  const s = raw.trim().toLowerCase();
  if (s === '' || s === '0' || s === 'false' || s === 'off' || s === 'no') {
    return 'off';
  }
  if (s === '2' || s === 'verbose' || s === 'all') {
    return 'verbose';
  }

  return 'debug';
}

function isVerboseTruthy(value: string | undefined): boolean {
  if (value === undefined || value === '') {
    return false;
  }
  const s = value.trim().toLowerCase();
  return (
    s === '1' || s === 'true' || s === 'yes' || s === 'on' || s === 'verbose'
  );
}

function writeDebugLine(parts: readonly unknown[]): void {
  console.error(RALPH_DEBUG_LOG_PREFIX, ...parts);
}

function writeVerboseLine(parts: readonly unknown[]): void {
  console.error(RALPH_DEBUG_LOG_PREFIX, VERBOSE_LABEL, ...parts);
}

/**
 * @description Builds a logger for the given level (does not mutate global {@link ralphDebugLogger}). Useful in tests or isolated subprocess helpers.
 */
export function createRalphDebugLogger(
  level: RalphDebugLevel,
): RalphDebugLogger {
  const debugOn = level === 'debug' || level === 'verbose';
  const verboseOn = level === 'verbose';

  return {
    debug: debugOn
      ? (...args: readonly unknown[]) => writeDebugLine(args)
      : noop,
    enabled: level !== 'off',
    level,
    verbose: verboseOn
      ? (...args: readonly unknown[]) => writeVerboseLine(args)
      : noop,
  };
}

const loggerState: {
  debug: (...args: readonly unknown[]) => void;
  level: RalphDebugLevel;
  verbose: (...args: readonly unknown[]) => void;
} = {
  debug: noop,
  level: 'off',
  verbose: noop,
};

function applyRalphDebugLevel(level: RalphDebugLevel): void {
  const next = createRalphDebugLogger(level);

  loggerState.level = next.level;
  loggerState.debug = next.debug;
  loggerState.verbose = next.verbose;
}

applyRalphDebugLevel(readRalphDebugConfigFromEnv());

/**
 * @description Global shim: call `debug` / `verbose` from instrumentation; no cost when disabled.
 */
export const ralphDebugLogger: RalphDebugLogger = {
  debug: (...args: readonly unknown[]) => {
    loggerState.debug(...args);
  },
  get enabled(): boolean {
    return loggerState.level !== 'off';
  },
  get level(): RalphDebugLevel {
    return loggerState.level;
  },
  verbose: (...args: readonly unknown[]) => {
    loggerState.verbose(...args);
  },
};

/**
 * @description Overrides level after env (e.g. CLI `--debug`). Prefer setting env before process start when possible.
 */
export function setRalphDebugLevel(level: RalphDebugLevel): void {
  applyRalphDebugLevel(level);
}

/**
 * @description Turns debug off until {@link setRalphDebugLevel}, {@link syncRalphDebugFromEnv}, or env on next process.
 */
export function disableRalphDebug(): void {
  applyRalphDebugLevel('off');
}

/**
 * @description Re-reads {@link readRalphDebugConfigFromEnv} and applies it to the global {@link ralphDebugLogger} (e.g. after env vars change in tests).
 */
export function syncRalphDebugFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): void {
  applyRalphDebugLevel(readRalphDebugConfigFromEnv(env));
}
