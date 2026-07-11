/**
 * @description Opt-in debug logging for Ralph / workflow-ralph. When disabled, {@link ralphDebugLogger} methods are no-ops (no branches in hot paths beyond one indirect call). Enable with {@link RALPH_DEBUG_ENV} or {@link RALPH_DEBUG_ENV_LEGACY}; verbose lines with {@link RALPH_VERBOSE_ENV} or `WORKFLOW_RALPH_DEBUG=verbose`.
 */

import {
  isWorkflowVerboseEnvTruthy,
  readWorkflowDebugLevelFromEnv,
  WORKFLOW_RALPH_DEBUG_ENV,
  WORKFLOW_RALPH_DEBUG_LEGACY_ENV,
  WORKFLOW_RALPH_VERBOSE_ENV,
  type WorkflowDebugLevel,
} from '@openthrottle/openthrottle-agentic-utils';

/** @deprecated Import {@link WORKFLOW_RALPH_DEBUG_ENV} from `@openthrottle/openthrottle-agentic-utils` instead. */
export const RALPH_DEBUG_ENV = WORKFLOW_RALPH_DEBUG_ENV;

/** @deprecated Import {@link WORKFLOW_RALPH_DEBUG_LEGACY_ENV} from `@openthrottle/openthrottle-agentic-utils` instead. */
export const RALPH_DEBUG_ENV_LEGACY = WORKFLOW_RALPH_DEBUG_LEGACY_ENV;

/** @deprecated Import {@link WORKFLOW_RALPH_VERBOSE_ENV} from `@openthrottle/openthrottle-agentic-utils` instead. */
export const RALPH_VERBOSE_ENV = WORKFLOW_RALPH_VERBOSE_ENV;

/** Prefix on every stderr debug line for grep-friendly logs. @public */
export const RALPH_DEBUG_LOG_PREFIX = '[workflow-ralph:debug]' as const;

export const VERBOSE_LABEL = '[verbose]' as const;

/** @deprecated Import {@link WorkflowDebugLevel} from `@openthrottle/openthrottle-agentic-utils` instead. */
export type RalphDebugLevel = WorkflowDebugLevel;

export interface RalphDebugLogger {
  /**
   * @description High-signal messages (phases, buffer sizes, parse outcomes). Enabled for `debug` and `verbose` levels.
   */
  debug: (...args: readonly unknown[]) => void;
  readonly enabled: boolean;
  readonly level: RalphDebugLevel;
  /**
   * @description Extra detail (e.g. tight loops). Enabled only for `verbose` level.
   */
  verbose: (...args: readonly unknown[]) => void;
}

/**
 * @description No-op used when debug is off; safe to pass where a `void`-returning callback is expected.
 * @public
 */
export const noop = (): void => {};

/**
 * @description Reads debug level from `env` (defaults to `process.env`). Pure for tests.
 * @deprecated Import {@link readWorkflowDebugLevelFromEnv} from `@openthrottle/openthrottle-agentic-utils` instead.
 * @public
 */
export function readRalphDebugConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): RalphDebugLevel {
  return readWorkflowDebugLevelFromEnv(env);
}

/**
 * @deprecated Import {@link isWorkflowVerboseEnvTruthy} from `@openthrottle/openthrottle-agentic-utils` instead.
 */
export function isVerboseTruthy(value: string | undefined): boolean {
  return isWorkflowVerboseEnvTruthy(value);
}

export function writeDebugLine(parts: readonly unknown[]): void {
  console.error(RALPH_DEBUG_LOG_PREFIX, ...parts);
}

export function writeVerboseLine(parts: readonly unknown[]): void {
  console.error(RALPH_DEBUG_LOG_PREFIX, VERBOSE_LABEL, ...parts);
}

/**
 * @description Builds a logger for the given level (does not mutate global {@link ralphDebugLogger}). Useful in tests or isolated subprocess helpers.
 * @public
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

export const loggerState: {
  debug: (...args: readonly unknown[]) => void;
  level: RalphDebugLevel;
  verbose: (...args: readonly unknown[]) => void;
} = {
  debug: noop,
  level: 'off',
  verbose: noop,
};

export function applyRalphDebugLevel(level: RalphDebugLevel): void {
  const next = createRalphDebugLogger(level);

  loggerState.level = next.level;
  loggerState.debug = next.debug;
  loggerState.verbose = next.verbose;
}

applyRalphDebugLevel(readRalphDebugConfigFromEnv());

/**
 * @description Global shim: call `debug` / `verbose` from instrumentation; no cost when disabled.
 * @public
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
 * @public
 */
export function setRalphDebugLevel(level: RalphDebugLevel): void {
  applyRalphDebugLevel(level);
}

/**
 * @description Turns debug off until {@link setRalphDebugLevel}, {@link syncRalphDebugFromEnv}, or env on next process.
 * @public
 */
export function disableRalphDebug(): void {
  applyRalphDebugLevel('off');
}

/**
 * @description Re-reads {@link readRalphDebugConfigFromEnv} and applies it to the global {@link ralphDebugLogger} (e.g. after env vars change in tests).
 * @public
 */
export function syncRalphDebugFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): void {
  applyRalphDebugLevel(readRalphDebugConfigFromEnv(env));
}
