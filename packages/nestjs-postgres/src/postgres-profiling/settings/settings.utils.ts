import { join } from 'node:path';

import {
  POSTGRES_PROFILING_DEDUPE_SECONDS_PATTERN,
  POSTGRES_PROFILING_DEFAULT_DEDUPE_SECONDS,
  POSTGRES_PROFILING_DEFAULT_MIN_DURATION_MS,
  POSTGRES_PROFILING_DEFAULT_OUTPUT_DIR_NAME,
  POSTGRES_PROFILING_DISABLED_SETTINGS,
  POSTGRES_PROFILING_ENV_VARS,
  POSTGRES_PROFILING_MATCH_ALL_TARGET,
  POSTGRES_PROFILING_MIN_DURATION_MS_PATTERN,
  POSTGRES_PROFILING_MODES,
  POSTGRES_PROFILING_TARGET_SEGMENT_SEPARATOR,
  POSTGRES_PROFILING_TARGET_SEPARATOR,
  POSTGRES_PROFILING_TRUE_VALUE,
  POSTGRES_PROFILING_WILDCARD,
} from '../postgres-profiling.constants.ts';
import type {
  CachedPostgresProfilingSettings,
  ParsedPostgresProfilingDedupe,
  ParsedPostgresProfilingMinDuration,
  ParsedPostgresProfilingOutput,
  PostgresProfilingEnabledSettings,
  PostgresProfilingOutput,
  PostgresProfilingRawEnv,
  PostgresProfilingSettings,
  PostgresProfilingTarget,
} from '../postgres-profiling.types.ts';

let cachedSettings: CachedPostgresProfilingSettings | undefined;

const parseTarget = (entry: string): PostgresProfilingTarget | undefined => {
  if (entry === POSTGRES_PROFILING_WILDCARD) {
    return POSTGRES_PROFILING_MATCH_ALL_TARGET;
  }

  const segments = entry.split(POSTGRES_PROFILING_TARGET_SEGMENT_SEPARATOR);
  const [className, methodName] = segments;

  if (segments.length !== 2 || !className || !methodName) {
    return undefined;
  }

  return { className, methodName, source: entry };
};

const isTrue = (value: string | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  const isTrueValue = normalized === POSTGRES_PROFILING_TRUE_VALUE;

  return isTrueValue;
};

const parseOutput = (
  modeValue: string | undefined,
  outputDirValue: string | undefined,
): ParsedPostgresProfilingOutput => {
  const mode = (modeValue ?? '').trim();
  const normalizedMode = mode.toLowerCase();

  if (normalizedMode === POSTGRES_PROFILING_MODES.FILE) {
    const outputDir = (outputDirValue ?? '').trim();

    const defaultOutputDir = join(
      process.cwd(),
      POSTGRES_PROFILING_DEFAULT_OUTPUT_DIR_NAME,
    );
    const hasOutputDir = outputDir.length > 0;

    return {
      output: {
        mode: POSTGRES_PROFILING_MODES.FILE,
        outputDir: hasOutputDir ? outputDir : defaultOutputDir,
      },
    };
  }

  const output: PostgresProfilingOutput = {
    mode: POSTGRES_PROFILING_MODES.LOGGER,
  };

  const isValidMode =
    mode.length === 0 || normalizedMode === POSTGRES_PROFILING_MODES.LOGGER;

  return isValidMode ? { output } : { invalidMode: mode, output };
};

const parseDedupeSeconds = (
  value: string | undefined,
): ParsedPostgresProfilingDedupe => {
  const trimmed = (value ?? '').trim();

  if (trimmed.length === 0) {
    return { seconds: POSTGRES_PROFILING_DEFAULT_DEDUPE_SECONDS };
  }

  if (POSTGRES_PROFILING_DEDUPE_SECONDS_PATTERN.test(trimmed)) {
    const seconds = Number(trimmed);

    if (Number.isSafeInteger(seconds)) {
      return { seconds };
    }
  }

  return {
    invalidSeconds: trimmed,
    seconds: POSTGRES_PROFILING_DEFAULT_DEDUPE_SECONDS,
  };
};

const parseMinDurationMs = (
  value: string | undefined,
): ParsedPostgresProfilingMinDuration => {
  const trimmed = (value ?? '').trim();

  if (trimmed.length === 0) {
    return { ms: POSTGRES_PROFILING_DEFAULT_MIN_DURATION_MS };
  }

  if (POSTGRES_PROFILING_MIN_DURATION_MS_PATTERN.test(trimmed)) {
    const ms = Number(trimmed);

    if (Number.isSafeInteger(ms)) {
      return { ms };
    }
  }

  return {
    invalidMs: trimmed,
    ms: POSTGRES_PROFILING_DEFAULT_MIN_DURATION_MS,
  };
};

const parseTargets = (
  targetsValue: string | undefined,
): Pick<PostgresProfilingEnabledSettings, 'invalidTargets' | 'targets'> => {
  const entries = (targetsValue ?? '')
    .split(POSTGRES_PROFILING_TARGET_SEPARATOR)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const targets: PostgresProfilingTarget[] = [];
  const invalidTargets: string[] = [];

  for (const entry of entries) {
    const target = parseTarget(entry);

    if (target) {
      targets.push(target);
    } else {
      invalidTargets.push(entry);
    }
  }

  // An unset or empty list means all; a list of only invalid entries matches nothing.
  return {
    invalidTargets,
    targets:
      entries.length === 0 ? [POSTGRES_PROFILING_MATCH_ALL_TARGET] : targets,
  };
};

const parseSettings = (
  rawEnv: PostgresProfilingRawEnv,
): PostgresProfilingSettings => {
  if (!isTrue(rawEnv.profiling)) {
    return POSTGRES_PROFILING_DISABLED_SETTINGS;
  }

  const { invalidMode, output } = parseOutput(rawEnv.mode, rawEnv.outputDir);
  const { invalidSeconds, seconds } = parseDedupeSeconds(rawEnv.dedupeSeconds);
  const { invalidMs, ms } = parseMinDurationMs(rawEnv.minDurationMs);

  return {
    analyze: isTrue(rawEnv.analyze),
    dedupeWindowSeconds: seconds,
    enabled: true,
    ...(invalidSeconds === undefined
      ? {}
      : { invalidDedupeSeconds: invalidSeconds }),
    ...(invalidMs === undefined ? {} : { invalidMinDurationMs: invalidMs }),
    ...(invalidMode === undefined ? {} : { invalidMode }),
    ...parseTargets(rawEnv.targets),
    minDurationMs: ms,
    output,
  };
};

const readRawEnv = (): PostgresProfilingRawEnv => {
  const rawEnv: PostgresProfilingRawEnv = {
    analyze: process.env[POSTGRES_PROFILING_ENV_VARS.ANALYZE],
    dedupeSeconds: process.env[POSTGRES_PROFILING_ENV_VARS.DEDUPE_SECONDS],
    minDurationMs: process.env[POSTGRES_PROFILING_ENV_VARS.MIN_DURATION_MS],
    mode: process.env[POSTGRES_PROFILING_ENV_VARS.MODE],
    outputDir: process.env[POSTGRES_PROFILING_ENV_VARS.OUTPUT_DIR],
    profiling: process.env[POSTGRES_PROFILING_ENV_VARS.PROFILING],
    targets: process.env[POSTGRES_PROFILING_ENV_VARS.TARGETS],
  };

  return rawEnv;
};

const isSameRawEnv = (
  left: PostgresProfilingRawEnv,
  right: PostgresProfilingRawEnv,
): boolean => {
  const isSame =
    left.analyze === right.analyze &&
    left.dedupeSeconds === right.dedupeSeconds &&
    left.minDurationMs === right.minDurationMs &&
    left.mode === right.mode &&
    left.outputDir === right.outputDir &&
    left.profiling === right.profiling &&
    left.targets === right.targets;

  return isSame;
};

/**
 * @description Reads `POSTGRES_PROFILING` and its `_TARGETS`, `_ANALYZE`, `_DEDUPE_SECONDS`,
 * `_MIN_DURATION_MS`, `_MODE` and `_OUTPUT_DIR` companions. The result is cached against the seven raw strings, so the
 * env (and `process.cwd()` for the default output dir) is only re-read when one changes.
 */
export const readPostgresProfilingSettings = (): PostgresProfilingSettings => {
  const rawEnv = readRawEnv();

  if (cachedSettings && isSameRawEnv(cachedSettings.rawEnv, rawEnv)) {
    return cachedSettings.settings;
  }

  const settings = parseSettings(rawEnv);

  cachedSettings = { rawEnv, settings };

  return settings;
};

/**
 * @description Matches case-sensitively; `className` is the runtime subclass name.
 */
export const isProfilingTarget = (
  settings: PostgresProfilingSettings,
  className: string,
  methodName: string,
): boolean => {
  if (!settings.enabled) {
    return false;
  }

  const isMatchFound = settings.targets.some(
    (target) =>
      (target.className === POSTGRES_PROFILING_WILDCARD ||
        target.className === className) &&
      (target.methodName === POSTGRES_PROFILING_WILDCARD ||
        target.methodName === methodName),
  );

  return isMatchFound;
};
