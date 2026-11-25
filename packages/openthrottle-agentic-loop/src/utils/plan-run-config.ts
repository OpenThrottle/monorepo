/**
 * @description Plan-run config loader: built-in defaults, the optional `defaults` block of the
 * repo's `.openthrottle/ot-loop.json` (cwd), then environment variables. Enqueue tuning applies on
 * top (see {@link PLAN_RUN_CONFIG_PRECEDENCE}).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isErrorWithCode, isRecord } from '@openthrottle/nodejs-utils';
import type {
  WorkflowDebugLevel,
  Writable,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  DEFAULT_PLAN_RUN_MODEL,
  DEFAULT_WORKFLOW_RUNNER,
  getOpenThrottleRoot,
  isWorkflowVerboseEnvTruthy,
  parseWorkflowRunnerId,
  PLAN_RUN_DEBUG_ENV,
  PLAN_RUN_OT_ROOT_ENV,
  PLAN_RUN_VERBOSE_ENV,
  readWorkflowDebugLevelFromEnv,
} from '@openthrottle/openthrottle-agentic-utils';

import type {
  PlanRunDefaultsDebug,
  PlanRunDefaultsFileV1Json,
  PlanRunResolvedDefaults,
} from '../contract/index.ts';
import {
  PLAN_RUN_DEFAULTS_FILENAME,
  PLAN_RUN_DEFAULTS_KEY,
  PLAN_RUN_ENV,
} from '../data/data.plan-run-config.ts';

const V1_KNOWN_ROOT_KEYS = new Set([
  'debug',
  'driver',
  'iterationTimeout',
  'lifecycleHooksChildJobs',
  'model',
  'otRoot',
  'worktreeBase',
]);

const DEFAULT_DEBUG: PlanRunDefaultsDebug = 'omit';
const DEFAULT_LIFECYCLE_HOOKS_CHILD_JOBS = true;

/** @internal Mutable builder for v1 file JSON. */
type PlanRunDefaultsFileV1Draft = Partial<Writable<PlanRunDefaultsFileV1Json>>;

const isEnoent = (error: unknown): boolean => {
  return isErrorWithCode(error) && error.code === 'ENOENT';
};

/**
 * @description Parses a positive integer from an env value; returns undefined if missing/invalid.
 */
const parsePositiveIntEnv = (
  raw: string | undefined,
  varName: string,
): number | undefined => {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }
  const value = parseInt(raw.trim(), 10);
  if (Number.isNaN(value) || value < 1) {
    throw new Error(
      `${varName} must be a positive integer; got "${raw.trim()}"`,
    );
  }
  return value;
};

const assertKnownKeys = (
  o: Record<string, unknown>,
  known: Set<string>,
  filePath: string,
  label: string,
): void => {
  for (const key of Object.keys(o)) {
    if (!known.has(key)) {
      throw new Error(`${filePath}: unknown ${label} key "${key}"`);
    }
  }
};

const parseDebugFileValue = (
  value: unknown,
  filePath: string,
): PlanRunDefaultsDebug => {
  if (value === 'omit' || value === 'debug' || value === 'verbose') {
    return value;
  }
  throw new Error(`${filePath}: "debug" must be "omit", "debug", or "verbose"`);
};

/**
 * @description Reads an optional string field; an empty string means "unset".
 */
const readOptionalString = (
  o: Record<string, unknown>,
  key: string,
  filePath: string,
): string | undefined => {
  const value = o[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${filePath}: "${key}" must be a string`);
  }
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * @description Validates and extracts v1 defaults from the parsed `defaults` block.
 */
export const normalizePlanRunDefaultsFileV1 = (
  parsed: unknown,
  filePath: string = PLAN_RUN_DEFAULTS_FILENAME,
): PlanRunDefaultsFileV1Json => {
  if (!isRecord(parsed)) {
    throw new Error(`${filePath} must be a JSON object`);
  }
  assertKnownKeys(parsed, V1_KNOWN_ROOT_KEYS, filePath, 'top-level');

  const o = parsed;
  const out: PlanRunDefaultsFileV1Draft = {};

  if ('driver' in o && o.driver !== undefined) {
    if (typeof o.driver !== 'string' || o.driver.trim() === '') {
      throw new Error(`${filePath}: "driver" must be a non-empty string`);
    }
    out.driver = parseWorkflowRunnerId(o.driver.trim(), 'file');
  }
  if ('iterationTimeout' in o && o.iterationTimeout !== undefined) {
    if (
      typeof o.iterationTimeout !== 'number' ||
      !Number.isInteger(o.iterationTimeout) ||
      o.iterationTimeout < 1
    ) {
      throw new Error(
        `${filePath}: "iterationTimeout" must be a positive integer (seconds)`,
      );
    }
    out.iterationTimeout = o.iterationTimeout;
  }
  if ('model' in o && o.model !== undefined) {
    if (typeof o.model !== 'string') {
      throw new Error(`${filePath}: "model" must be a string`);
    }
    out.model = o.model.trim();
  }
  const worktreeBase = readOptionalString(o, 'worktreeBase', filePath);
  if (worktreeBase !== undefined) {
    out.worktreeBase = worktreeBase;
  }
  const otRoot = readOptionalString(o, 'otRoot', filePath);
  if (otRoot !== undefined) {
    out.otRoot = otRoot;
  }
  if ('debug' in o && o.debug !== undefined) {
    out.debug = parseDebugFileValue(o.debug, filePath);
  }
  if (
    'lifecycleHooksChildJobs' in o &&
    o.lifecycleHooksChildJobs !== undefined
  ) {
    if (typeof o.lifecycleHooksChildJobs !== 'boolean') {
      throw new Error(
        `${filePath}: "lifecycleHooksChildJobs" must be a boolean`,
      );
    }
    out.lifecycleHooksChildJobs = o.lifecycleHooksChildJobs;
  }

  return out;
};

/**
 * @description Loads the optional `defaults` block of `.openthrottle/ot-loop.json` from `cwd`. A
 * missing file or a file without a `defaults` block returns `{}`; the file's other sections
 * (`validation`, `setup`, `finalValidation`) belong to `resolveOtLoopCommands`.
 */
export const loadPlanRunDefaultsFileV1 = (
  cwd: string,
): PlanRunDefaultsFileV1Json => {
  const filePath = join(cwd, PLAN_RUN_DEFAULTS_FILENAME);
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      throw new Error(`${PLAN_RUN_DEFAULTS_FILENAME} must be a JSON object`);
    }
    const defaults = parsed[PLAN_RUN_DEFAULTS_KEY];
    if (defaults === undefined) {
      return {};
    }
    return normalizePlanRunDefaultsFileV1(
      defaults,
      `${PLAN_RUN_DEFAULTS_FILENAME} "${PLAN_RUN_DEFAULTS_KEY}"`,
    );
  } catch (error) {
    if (isEnoent(error)) {
      return {};
    }
    throw error;
  }
};

const mapDebugLevelToDefaultsDebug = (
  level: WorkflowDebugLevel,
): PlanRunDefaultsDebug => {
  switch (level) {
    case 'off':
      return 'omit';
    case 'debug':
      return 'debug';
    case 'verbose':
      return 'verbose';
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
};

/**
 * @description Reads the debug shim level from env (`OPENTHROTTLE_PLAN_RUN_DEBUG`,
 * `OPENTHROTTLE_PLAN_RUN_VERBOSE`).
 */
export const readPlanRunDebugFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): PlanRunDefaultsDebug | undefined => {
  const hasDebugEnv =
    isWorkflowVerboseEnvTruthy(env[PLAN_RUN_VERBOSE_ENV]) ||
    (env[PLAN_RUN_DEBUG_ENV]?.trim() ?? '') !== '';

  if (!hasDebugEnv) {
    return undefined;
  }

  return mapDebugLevelToDefaultsDebug(readWorkflowDebugLevelFromEnv(env));
};

const readLifecycleHooksChildJobsFromEnv = (
  env: NodeJS.ProcessEnv,
): boolean | undefined => {
  const raw = env[PLAN_RUN_ENV.lifecycleHooksChildJobs]?.trim();
  if (raw === undefined || raw === '') {
    return undefined;
  }

  return raw.toLowerCase() !== 'false';
};

/**
 * @description Reads plan-run env vars (no secrets).
 */
export const readPlanRunConfigEnv = (
  env: NodeJS.ProcessEnv = process.env,
): PlanRunDefaultsFileV1Json => {
  const out: PlanRunDefaultsFileV1Draft = {};

  const driverRaw = env[PLAN_RUN_ENV.driver];
  if (driverRaw !== undefined && driverRaw.trim() !== '') {
    out.driver = parseWorkflowRunnerId(driverRaw.trim(), 'env');
  }

  const iterationTimeout = parsePositiveIntEnv(
    env[PLAN_RUN_ENV.iterationTimeout],
    PLAN_RUN_ENV.iterationTimeout,
  );
  if (iterationTimeout !== undefined) {
    out.iterationTimeout = iterationTimeout;
  }

  const modelRaw = env[PLAN_RUN_ENV.model];
  if (modelRaw !== undefined && modelRaw.trim() !== '') {
    out.model = modelRaw.trim();
  }

  const worktreeBaseRaw = env[PLAN_RUN_ENV.worktreeBase];
  if (worktreeBaseRaw !== undefined && worktreeBaseRaw.trim() !== '') {
    out.worktreeBase = worktreeBaseRaw.trim();
  }

  const otRootRaw = env[PLAN_RUN_ENV.otRoot];
  if (otRootRaw !== undefined && otRootRaw.trim() !== '') {
    out.otRoot = otRootRaw.trim();
  }

  const debug = readPlanRunDebugFromEnv(env);
  if (debug !== undefined) {
    out.debug = debug;
  }

  const lifecycleHooksChildJobs = readLifecycleHooksChildJobsFromEnv(env);
  if (lifecycleHooksChildJobs !== undefined) {
    out.lifecycleHooksChildJobs = lifecycleHooksChildJobs;
  }

  return out;
};

/**
 * @description Merges built-in defaults, optional file (`cwd`), and env.
 * Order: **env overrides file** over built-ins. Enqueue tuning applies on top.
 */
export const loadPlanRunConfig = (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): PlanRunResolvedDefaults => {
  const file = loadPlanRunDefaultsFileV1(cwd);
  const envLayer = readPlanRunConfigEnv(env);

  return {
    debug: envLayer.debug ?? file.debug ?? DEFAULT_DEBUG,
    driver: envLayer.driver ?? file.driver ?? DEFAULT_WORKFLOW_RUNNER,
    iterationTimeout: envLayer.iterationTimeout ?? file.iterationTimeout,
    lifecycleHooksChildJobs:
      envLayer.lifecycleHooksChildJobs ??
      file.lifecycleHooksChildJobs ??
      DEFAULT_LIFECYCLE_HOOKS_CHILD_JOBS,
    model: envLayer.model ?? file.model ?? DEFAULT_PLAN_RUN_MODEL,
    otRoot: envLayer.otRoot ?? file.otRoot,
    worktreeBase: envLayer.worktreeBase ?? file.worktreeBase,
  };
};

/** @description Maps {@link PlanRunDefaultsDebug} to {@link WorkflowDebugLevel}. */
export const mapDefaultsDebugToDebugLevel = (
  debug: PlanRunDefaultsDebug,
): WorkflowDebugLevel => {
  switch (debug) {
    case 'omit':
      return 'off';
    case 'debug':
      return 'debug';
    case 'verbose':
      return 'verbose';
    default: {
      const _exhaustive: never = debug;
      return _exhaustive;
    }
  }
};

/**
 * @description Sets {@link PLAN_RUN_OT_ROOT_ENV} from the config file, env, or module walk-up when unset.
 * @public
 */
export const applyPlanRunOtRootFromConfig = (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): void => {
  if ((env[PLAN_RUN_OT_ROOT_ENV]?.trim() ?? '') !== '') {
    return;
  }

  const config = loadPlanRunConfig(cwd, env);
  const fromConfig = config.otRoot?.trim();
  if (fromConfig !== undefined && fromConfig !== '') {
    env[PLAN_RUN_OT_ROOT_ENV] = fromConfig;
    return;
  }

  const resolved = getOpenThrottleRoot(env);
  if (resolved !== undefined) {
    env[PLAN_RUN_OT_ROOT_ENV] = resolved;
  }
};
