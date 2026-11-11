import type { LoggerService } from '@openthrottle/nestjs-modules';

import {
  POSTGRES_PROFILING_DEFAULT_DEDUPE_SECONDS,
  POSTGRES_PROFILING_DEFAULT_MIN_DURATION_MS,
  POSTGRES_PROFILING_ENV_VARS,
  POSTGRES_PROFILING_LOGGER_CONTEXT,
} from '../postgres-profiling.constants.ts';
import type { PostgresProfilingEnabledSettings } from '../postgres-profiling.types.ts';

let hasLoggedStartup = false;

const describeMinDuration = (minDurationMs: number): string => {
  const description = minDurationMs === 0 ? '' : `, min ${minDurationMs}ms`;

  return description;
};

const describeDedupeWindow = (dedupeWindowSeconds: number): string => {
  const description =
    dedupeWindowSeconds === 0 ? 'off' : `${dedupeWindowSeconds}s`;

  return description;
};

export const buildPostgresProfilingStartupLine = (
  settings: PostgresProfilingEnabledSettings,
): string => {
  const targets = settings.targets.map(({ source }) => source).join(', ');
  const analyze = settings.analyze ? 'on' : 'off';
  const dedupe = describeDedupeWindow(settings.dedupeWindowSeconds);
  const minDuration = describeMinDuration(settings.minDurationMs);
  const line = `profiling enabled for ${targets} (analyze ${analyze}, mode ${settings.output.mode}, dedupe ${dedupe}${minDuration})`;

  return line;
};

const buildInvalidDedupeSecondsWarning = (
  invalidDedupeSeconds: string,
): string => {
  const value = JSON.stringify(invalidDedupeSeconds);
  const warning = `Ignoring invalid ${POSTGRES_PROFILING_ENV_VARS.DEDUPE_SECONDS} value ${value} (expected a non-negative whole number of seconds, 0 to disable); using ${POSTGRES_PROFILING_DEFAULT_DEDUPE_SECONDS}`;

  return warning;
};

const buildInvalidMinDurationMsWarning = (
  invalidMinDurationMs: string,
): string => {
  const value = JSON.stringify(invalidMinDurationMs);
  const warning = `Ignoring invalid ${POSTGRES_PROFILING_ENV_VARS.MIN_DURATION_MS} value ${value} (expected a non-negative whole number of milliseconds, 0 to explain every call); using ${POSTGRES_PROFILING_DEFAULT_MIN_DURATION_MS}`;

  return warning;
};

const buildInvalidModeWarning = (invalidMode: string): string => {
  const value = JSON.stringify(invalidMode);
  const warning = `Ignoring invalid ${POSTGRES_PROFILING_ENV_VARS.MODE} value ${value} (expected logger or file); using logger`;

  return warning;
};

const buildInvalidTargetsWarning = (
  settings: PostgresProfilingEnabledSettings,
): string => {
  const entries = settings.invalidTargets.join(', ');
  const warning = `Ignoring invalid ${POSTGRES_PROFILING_ENV_VARS.TARGETS} entries (expected Class.method, with * allowed in either part, or *): ${entries}`;

  return warning;
};

/**
 * @description Logs the active profiling targets, analyze, mode, dedupe window and (when set) minimum
 * duration, plus any invalid dedupe, minimum duration, mode or target values, the first time profiling is evaluated as on in this process.
 * Later calls do nothing.
 */
export const logPostgresProfilingStartupOnce = (
  logger: LoggerService,
  settings: PostgresProfilingEnabledSettings,
): void => {
  if (hasLoggedStartup) {
    return;
  }

  hasLoggedStartup = true;
  logger.info(buildPostgresProfilingStartupLine(settings), {
    context: POSTGRES_PROFILING_LOGGER_CONTEXT,
  });

  if (settings.invalidDedupeSeconds !== undefined) {
    logger.warn(
      buildInvalidDedupeSecondsWarning(settings.invalidDedupeSeconds),
      {
        context: POSTGRES_PROFILING_LOGGER_CONTEXT,
      },
    );
  }

  if (settings.invalidMinDurationMs !== undefined) {
    logger.warn(
      buildInvalidMinDurationMsWarning(settings.invalidMinDurationMs),
      {
        context: POSTGRES_PROFILING_LOGGER_CONTEXT,
      },
    );
  }

  if (settings.invalidMode !== undefined) {
    logger.warn(buildInvalidModeWarning(settings.invalidMode), {
      context: POSTGRES_PROFILING_LOGGER_CONTEXT,
    });
  }

  if (settings.invalidTargets.length > 0) {
    logger.warn(buildInvalidTargetsWarning(settings), {
      context: POSTGRES_PROFILING_LOGGER_CONTEXT,
    });
  }
};

/** Test-only: clears the once-per-process flag. */
export const resetPostgresProfilingStartupLog = (): void => {
  hasLoggedStartup = false;
};
