/**
 * @description Shared Ralph/workflow config loader: built-in defaults, optional
 * `.workflow-ralph.json` (cwd), then environment variables. CLI / enqueue overrides
 * apply on top (see {@link WORKFLOW_RALPH_CONFIG_PRECEDENCE}).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  WorkflowRalphDefaultsDebug,
  WorkflowRalphDefaultsDiagnosticsJson,
  WorkflowRalphDefaultsFileV1Json,
  WorkflowRalphDefaultsSpawnJson,
  WorkflowRalphResolvedDefaults,
} from './workflow-ralph-defaults.types.js';
import { WORKFLOW_RALPH_DEFAULTS_FILENAME } from './workflow-ralph-defaults.types.js';
import {
  DEFAULT_RALPH_RUNNER,
  parseRalphExecutionBackendId,
} from '../utils/ralph-execution-backend.js';
import {
  isWorkflowVerboseEnvTruthy,
  readWorkflowDebugLevelFromEnv,
  WORKFLOW_RALPH_DEBUG_ENV,
  WORKFLOW_RALPH_DEBUG_LEGACY_ENV,
  WORKFLOW_RALPH_VERBOSE_ENV,
  type WorkflowDebugLevel,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  WORKFLOW_RALPH_TRANSPORT_ENV,
  type WorkflowRalphTransport,
} from '../utils/workflow-transport.js';
import {
  OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV,
  WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV,
} from '../utils/ot-diagnostics.js';
import type { Writable } from '../type.js';

export const DEFAULT_RALPH_PROMPT = '/agents-ralph';
export const DEFAULT_RALPH_ITERATIONS = 10;
export const DEFAULT_RALPH_MODEL = 'auto';

/**
 * @description Environment variable names for run tuning and prompt profile.
 */
export const WORKFLOW_RALPH_ENV = {
  backend: 'WORKFLOW_RALPH_BACKEND',
  iterationTimeout: 'WORKFLOW_RALPH_ITERATION_TIMEOUT',
  iterations: 'WORKFLOW_RALPH_ITERATIONS',
  model: 'WORKFLOW_RALPH_MODEL',
  project: 'WORKFLOW_RALPH_PROJECT',
  prompt: 'WORKFLOW_RALPH_PROMPT',
  promptFile: 'WORKFLOW_RALPH_PROMPT_FILE',
  skipWorktreeSetup: 'WORKFLOW_RALPH_SKIP_WORKTREE_SETUP',
  taskIterations: 'WORKFLOW_RALPH_TASK_ITERATIONS',
  worktree: 'WORKFLOW_RALPH_WORKTREE',
  worktreeBase: 'WORKFLOW_RALPH_WORKTREE_BASE',
} as const;

/** @description Extended env vars for spawn, diagnostics, transport, and debug. */
export const WORKFLOW_RALPH_CONFIG_ENV = {
  ...WORKFLOW_RALPH_ENV,
  debug: WORKFLOW_RALPH_DEBUG_ENV,
  debugLegacy: WORKFLOW_RALPH_DEBUG_LEGACY_ENV,
  lifecycleHooksChildJobs: 'OPENTHROTTLE_LIFECYCLE_HOOKS_CHILD_JOBS',
  spawnHome: 'WORKFLOW_RALPH_SPAWN_HOME',
  spawnOtRoot: 'WORKFLOW_RALPH_OT_ROOT',
  spawnXdgConfigHome: 'WORKFLOW_RALPH_SPAWN_XDG_CONFIG_HOME',
  transport: WORKFLOW_RALPH_TRANSPORT_ENV,
  verbose: WORKFLOW_RALPH_VERBOSE_ENV,
} as const;

const V1_KNOWN_ROOT_KEYS = new Set([
  'backend',
  'debug',
  'diagnostics',
  'iterationTimeout',
  'iterations',
  'lifecycleHooksChildJobs',
  'model',
  'project',
  'prompt',
  'promptFile',
  'skipWorktreeSetup',
  'spawn',
  'taskIterations',
  'transport',
  'worktree',
  'worktreeBase',
]);

const SPAWN_KNOWN_KEYS = new Set(['home', 'otRoot', 'xdgConfigHome']);
const DIAGNOSTICS_KNOWN_KEYS = new Set(['ot', 'spawn']);

const DEFAULT_DEBUG: WorkflowRalphDefaultsDebug = 'omit';
const DEFAULT_TRANSPORT: WorkflowRalphTransport = 'graphql';
const DEFAULT_LIFECYCLE_HOOKS_CHILD_JOBS = true;

/** @internal Mutable builder for v1 file JSON. */
type WorkflowRalphDefaultsFileV1Draft = Partial<{
  -readonly [K in keyof WorkflowRalphDefaultsFileV1Json]: WorkflowRalphDefaultsFileV1Json[K];
}>;

const isNodeErrno = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === 'object' && error !== null && 'code' in error;

const isEnoent = (error: unknown): boolean =>
  isNodeErrno(error) && error.code === 'ENOENT';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

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
): WorkflowRalphDefaultsDebug => {
  if (value === 'omit' || value === 'debug' || value === 'verbose') {
    return value;
  }
  throw new Error(`${filePath}: "debug" must be "omit", "debug", or "verbose"`);
};

const parseTransportFileValue = (
  value: unknown,
  filePath: string,
): WorkflowRalphTransport => {
  if (value === 'graphql' || value === 'postgres-direct') {
    return value;
  }
  throw new Error(
    `${filePath}: "transport" must be "graphql" or "postgres-direct"`,
  );
};

const normalizeSpawnFile = (
  value: unknown,
  filePath: string,
): WorkflowRalphDefaultsSpawnJson => {
  if (!isPlainObject(value)) {
    throw new Error(`${filePath}: "spawn" must be a JSON object`);
  }
  assertKnownKeys(value, SPAWN_KNOWN_KEYS, filePath, 'spawn');
  const out: {
    home?: string;
    otRoot?: string;
    xdgConfigHome?: string;
  } = {};

  if ('home' in value && value.home !== undefined) {
    if (typeof value.home !== 'string' || value.home.trim() === '') {
      throw new Error(`${filePath}: "spawn.home" must be a non-empty string`);
    }
    out.home = value.home.trim();
  }
  if ('xdgConfigHome' in value && value.xdgConfigHome !== undefined) {
    if (
      typeof value.xdgConfigHome !== 'string' ||
      value.xdgConfigHome.trim() === ''
    ) {
      throw new Error(
        `${filePath}: "spawn.xdgConfigHome" must be a non-empty string`,
      );
    }
    out.xdgConfigHome = value.xdgConfigHome.trim();
  }
  if ('otRoot' in value && value.otRoot !== undefined) {
    if (typeof value.otRoot !== 'string' || value.otRoot.trim() === '') {
      throw new Error(`${filePath}: "spawn.otRoot" must be a non-empty string`);
    }
    out.otRoot = value.otRoot.trim();
  }

  return out;
};

const normalizeDiagnosticsFile = (
  value: unknown,
  filePath: string,
): WorkflowRalphDefaultsDiagnosticsJson => {
  if (!isPlainObject(value)) {
    throw new Error(`${filePath}: "diagnostics" must be a JSON object`);
  }
  assertKnownKeys(value, DIAGNOSTICS_KNOWN_KEYS, filePath, 'diagnostics');
  const out: Writable<WorkflowRalphDefaultsDiagnosticsJson> = {};

  if ('ot' in value && value.ot !== undefined) {
    if (typeof value.ot !== 'boolean') {
      throw new Error(`${filePath}: "diagnostics.ot" must be a boolean`);
    }
    out.ot = value.ot;
  }
  if ('spawn' in value && value.spawn !== undefined) {
    if (typeof value.spawn !== 'boolean') {
      throw new Error(`${filePath}: "diagnostics.spawn" must be a boolean`);
    }
    out.spawn = value.spawn;
  }

  return out;
};

/**
 * @description Validates and extracts v1 defaults from parsed JSON object content.
 */
export const normalizeWorkflowRalphDefaultsFileV1 = (
  parsed: unknown,
  filePath: string = WORKFLOW_RALPH_DEFAULTS_FILENAME,
): WorkflowRalphDefaultsFileV1Json => {
  if (!isPlainObject(parsed)) {
    throw new Error(`${filePath} must be a JSON object`);
  }
  assertKnownKeys(parsed, V1_KNOWN_ROOT_KEYS, filePath, 'top-level');

  const o = parsed;
  const out: WorkflowRalphDefaultsFileV1Draft = {};

  if ('backend' in o && o.backend !== undefined) {
    if (typeof o.backend !== 'string' || o.backend.trim() === '') {
      throw new Error(`${filePath}: "backend" must be a non-empty string`);
    }
    out.backend = parseRalphExecutionBackendId(o.backend.trim(), 'file');
  }
  if ('promptFile' in o && o.promptFile !== undefined) {
    if (typeof o.promptFile !== 'string' || o.promptFile.trim() === '') {
      throw new Error(`${filePath}: "promptFile" must be a non-empty string`);
    }
    if ('prompt' in o && o.prompt !== undefined) {
      throw new Error(
        `${filePath}: "prompt" and "promptFile" cannot both be set`,
      );
    }
    out.promptFile = o.promptFile.trim();
  }
  if ('prompt' in o && o.prompt !== undefined) {
    if (typeof o.prompt !== 'string' || o.prompt.trim() === '') {
      throw new Error(`${filePath}: "prompt" must be a non-empty string`);
    }
    out.prompt = o.prompt.trim();
  }
  if ('iterations' in o && o.iterations !== undefined) {
    if (
      typeof o.iterations !== 'number' ||
      !Number.isInteger(o.iterations) ||
      o.iterations < 1
    ) {
      throw new Error(`${filePath}: "iterations" must be a positive integer`);
    }
    out.iterations = o.iterations;
  }
  if ('taskIterations' in o && o.taskIterations !== undefined) {
    if (
      typeof o.taskIterations !== 'number' ||
      !Number.isInteger(o.taskIterations) ||
      o.taskIterations < 1
    ) {
      throw new Error(
        `${filePath}: "taskIterations" must be a positive integer`,
      );
    }
    out.taskIterations = o.taskIterations;
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
  if ('project' in o && o.project !== undefined) {
    if (typeof o.project !== 'string') {
      throw new Error(`${filePath}: "project" must be a string`);
    }
    const p = o.project.trim();
    if (p !== '') {
      out.project = p;
    }
  }
  if ('worktree' in o && o.worktree !== undefined) {
    if (typeof o.worktree !== 'string') {
      throw new Error(`${filePath}: "worktree" must be a string`);
    }
    const w = o.worktree.trim();
    if (w !== '') {
      out.worktree = w;
    }
  }
  if ('worktreeBase' in o && o.worktreeBase !== undefined) {
    if (typeof o.worktreeBase !== 'string') {
      throw new Error(`${filePath}: "worktreeBase" must be a string`);
    }
    const b = o.worktreeBase.trim();
    if (b !== '') {
      out.worktreeBase = b;
    }
  }
  if ('skipWorktreeSetup' in o && o.skipWorktreeSetup !== undefined) {
    if (typeof o.skipWorktreeSetup !== 'boolean') {
      throw new Error(`${filePath}: "skipWorktreeSetup" must be a boolean`);
    }
    out.skipWorktreeSetup = o.skipWorktreeSetup;
  }
  if ('debug' in o && o.debug !== undefined) {
    out.debug = parseDebugFileValue(o.debug, filePath);
  }
  if ('transport' in o && o.transport !== undefined) {
    out.transport = parseTransportFileValue(o.transport, filePath);
  }
  if ('spawn' in o && o.spawn !== undefined) {
    out.spawn = normalizeSpawnFile(o.spawn, filePath);
  }
  if ('diagnostics' in o && o.diagnostics !== undefined) {
    out.diagnostics = normalizeDiagnosticsFile(o.diagnostics, filePath);
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

  return out as WorkflowRalphDefaultsFileV1Json;
};

/**
 * @description Loads optional `.workflow-ralph.json` from `cwd`. Missing file returns `{}`.
 */
export const loadWorkflowRalphDefaultsFileV1 = (
  cwd: string,
): WorkflowRalphDefaultsFileV1Json => {
  const filePath = join(cwd, WORKFLOW_RALPH_DEFAULTS_FILENAME);
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return normalizeWorkflowRalphDefaultsFileV1(parsed);
  } catch (error) {
    if (isEnoent(error)) {
      return {};
    }
    throw error;
  }
};

const mapRalphDebugLevelToDefaultsDebug = (
  level: WorkflowDebugLevel,
): WorkflowRalphDefaultsDebug => {
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
 * @description Reads debug shim level from env (`WORKFLOW_RALPH_DEBUG`, `RALPH_DEBUG`, `WORKFLOW_RALPH_VERBOSE`).
 */
export const readWorkflowRalphDebugFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): WorkflowRalphDefaultsDebug | undefined => {
  const hasDebugEnv =
    isWorkflowVerboseEnvTruthy(env[WORKFLOW_RALPH_VERBOSE_ENV]) ||
    (env[WORKFLOW_RALPH_DEBUG_ENV]?.trim() ?? '') !== '' ||
    (env[WORKFLOW_RALPH_DEBUG_LEGACY_ENV]?.trim() ?? '') !== '';

  if (!hasDebugEnv) {
    return undefined;
  }

  return mapRalphDebugLevelToDefaultsDebug(readWorkflowDebugLevelFromEnv(env));
};

const readTransportFromEnv = (
  env: NodeJS.ProcessEnv,
): WorkflowRalphTransport | undefined => {
  const raw = env[WORKFLOW_RALPH_TRANSPORT_ENV]?.trim().toLowerCase();
  if (raw === undefined || raw === '') {
    return undefined;
  }
  if (raw === 'postgres-direct' || raw === 'postgres') {
    return 'postgres-direct';
  }
  return 'graphql';
};

const isDiagnosticsEnvTruthy = (value: string | undefined): boolean => {
  if (value === undefined || value === '') {
    return false;
  }
  const s = value.trim().toLowerCase();
  return !(s === '' || s === '0' || s === 'false' || s === 'off' || s === 'no');
};

const readDiagnosticsFromEnv = (
  env: NodeJS.ProcessEnv,
): WorkflowRalphDefaultsDiagnosticsJson => {
  const out: Writable<WorkflowRalphDefaultsDiagnosticsJson> = {};

  const otRaw = env[WORKFLOW_RALPH_OT_DIAGNOSTICS_ENV];
  if (otRaw !== undefined && otRaw.trim() !== '') {
    out.ot = isDiagnosticsEnvTruthy(otRaw);
  }

  const spawnRaw = env[OPENTHROTTLE_PLANS_SPAWN_DIAGNOSTICS_ENV];
  if (spawnRaw !== undefined && spawnRaw.trim() !== '') {
    out.spawn = isDiagnosticsEnvTruthy(spawnRaw);
  }

  return out;
};

const readSpawnFromEnv = (
  env: NodeJS.ProcessEnv,
): WorkflowRalphDefaultsSpawnJson => {
  const out: Writable<WorkflowRalphDefaultsSpawnJson> = {};

  const home = env[WORKFLOW_RALPH_CONFIG_ENV.spawnHome]?.trim();
  if (home !== undefined && home !== '') {
    out.home = home;
  }

  const xdg = env[WORKFLOW_RALPH_CONFIG_ENV.spawnXdgConfigHome]?.trim();
  if (xdg !== undefined && xdg !== '') {
    out.xdgConfigHome = xdg;
  }

  const otRoot = env[WORKFLOW_RALPH_CONFIG_ENV.spawnOtRoot]?.trim();
  if (otRoot !== undefined && otRoot !== '') {
    out.otRoot = otRoot;
  }

  return out;
};

const readLifecycleHooksChildJobsFromEnv = (
  env: NodeJS.ProcessEnv,
): boolean | undefined => {
  const raw = env[WORKFLOW_RALPH_CONFIG_ENV.lifecycleHooksChildJobs]?.trim();
  if (raw === undefined || raw === '') {
    return undefined;
  }

  return raw.toLowerCase() !== 'false';
};

/**
 * @description Reads run-tuning and extended `WORKFLOW_RALPH_*` env vars (no secrets).
 */
export const readWorkflowRalphConfigEnv = (
  env: NodeJS.ProcessEnv = process.env,
): WorkflowRalphDefaultsFileV1Json => {
  const out: WorkflowRalphDefaultsFileV1Draft = {};

  const backendRaw = env[WORKFLOW_RALPH_ENV.backend];
  if (backendRaw !== undefined && backendRaw.trim() !== '') {
    out.backend = parseRalphExecutionBackendId(backendRaw.trim(), 'env');
  }

  const promptRaw = env[WORKFLOW_RALPH_ENV.prompt];
  const promptFileRaw = env[WORKFLOW_RALPH_ENV.promptFile];
  const hasNamed = promptRaw !== undefined && promptRaw.trim() !== '';
  const hasFile = promptFileRaw !== undefined && promptFileRaw.trim() !== '';
  if (hasNamed && hasFile) {
    throw new Error(
      `${WORKFLOW_RALPH_ENV.prompt} and ${WORKFLOW_RALPH_ENV.promptFile} cannot both be set`,
    );
  }

  if (hasNamed) {
    out.prompt = promptRaw!.trim();
  }

  if (hasFile) {
    out.promptFile = promptFileRaw!.trim();
  }

  const iterations = parsePositiveIntEnv(
    env[WORKFLOW_RALPH_ENV.iterations],
    WORKFLOW_RALPH_ENV.iterations,
  );
  if (iterations !== undefined) {
    out.iterations = iterations;
  }

  const taskIterations = parsePositiveIntEnv(
    env[WORKFLOW_RALPH_ENV.taskIterations],
    WORKFLOW_RALPH_ENV.taskIterations,
  );
  if (taskIterations !== undefined) {
    out.taskIterations = taskIterations;
  }

  const iterationTimeout = parsePositiveIntEnv(
    env[WORKFLOW_RALPH_ENV.iterationTimeout],
    WORKFLOW_RALPH_ENV.iterationTimeout,
  );
  if (iterationTimeout !== undefined) {
    out.iterationTimeout = iterationTimeout;
  }

  const modelRaw = env[WORKFLOW_RALPH_ENV.model];
  if (modelRaw !== undefined && modelRaw.trim() !== '') {
    out.model = modelRaw.trim();
  }

  const projectRaw = env[WORKFLOW_RALPH_ENV.project];
  if (projectRaw !== undefined && projectRaw.trim() !== '') {
    out.project = projectRaw.trim();
  }

  const worktreeRaw = env[WORKFLOW_RALPH_ENV.worktree];
  if (worktreeRaw !== undefined && worktreeRaw.trim() !== '') {
    out.worktree = worktreeRaw.trim();
  }

  const worktreeBaseRaw = env[WORKFLOW_RALPH_ENV.worktreeBase];
  if (worktreeBaseRaw !== undefined && worktreeBaseRaw.trim() !== '') {
    out.worktreeBase = worktreeBaseRaw.trim();
  }

  const skipRaw = env[WORKFLOW_RALPH_ENV.skipWorktreeSetup]?.trim();
  if (skipRaw !== undefined && skipRaw !== '') {
    const lower = skipRaw.toLowerCase();
    if (
      lower === '1' ||
      lower === 'true' ||
      lower === 'yes' ||
      lower === 'on'
    ) {
      out.skipWorktreeSetup = true;
    } else if (
      lower === '0' ||
      lower === 'false' ||
      lower === 'no' ||
      lower === 'off'
    ) {
      out.skipWorktreeSetup = false;
    } else {
      throw new Error(
        `${WORKFLOW_RALPH_ENV.skipWorktreeSetup} must be a boolean (1|0|true|false); got "${skipRaw}"`,
      );
    }
  }

  const debug = readWorkflowRalphDebugFromEnv(env);
  if (debug !== undefined) {
    out.debug = debug;
  }

  const transport = readTransportFromEnv(env);
  if (transport !== undefined) {
    out.transport = transport;
  }

  const spawn = readSpawnFromEnv(env);
  if (Object.keys(spawn).length > 0) {
    out.spawn = spawn;
  }

  const diagnostics = readDiagnosticsFromEnv(env);
  if (Object.keys(diagnostics).length > 0) {
    out.diagnostics = diagnostics;
  }

  const lifecycleHooksChildJobs = readLifecycleHooksChildJobsFromEnv(env);
  if (lifecycleHooksChildJobs !== undefined) {
    out.lifecycleHooksChildJobs = lifecycleHooksChildJobs;
  }

  return out as WorkflowRalphDefaultsFileV1Json;
};

const mergeSpawn = (
  file: WorkflowRalphDefaultsSpawnJson | undefined,
  env: WorkflowRalphDefaultsSpawnJson | undefined,
): WorkflowRalphDefaultsSpawnJson => ({
  ...(file?.home !== undefined ? { home: file.home } : {}),
  ...(file?.xdgConfigHome !== undefined
    ? { xdgConfigHome: file.xdgConfigHome }
    : {}),
  ...(file?.otRoot !== undefined ? { otRoot: file.otRoot } : {}),
  ...(env?.home !== undefined ? { home: env.home } : {}),
  ...(env?.xdgConfigHome !== undefined
    ? { xdgConfigHome: env.xdgConfigHome }
    : {}),
  ...(env?.otRoot !== undefined ? { otRoot: env.otRoot } : {}),
});

const mergeDiagnostics = (
  file: WorkflowRalphDefaultsDiagnosticsJson | undefined,
  env: WorkflowRalphDefaultsDiagnosticsJson | undefined,
): WorkflowRalphDefaultsDiagnosticsJson => ({
  ot: env?.ot ?? file?.ot ?? false,
  spawn: env?.spawn ?? file?.spawn ?? false,
});

const assertPromptLayersCompatible = (
  promptFile: string | undefined,
  namedPrompt: string,
): void => {
  if (promptFile !== undefined && namedPrompt !== DEFAULT_RALPH_PROMPT) {
    throw new Error(
      'Cannot combine prompt file path with a non-default named prompt in defaults (env + .workflow-ralph.json). Use only one of prompt or promptFile.',
    );
  }
};

/**
 * @description Merges built-in defaults, optional file (`cwd`), and env.
 * Order: **env overrides file** over built-ins. CLI / enqueue apply on top.
 */
export const loadWorkflowRalphConfig = (
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
): WorkflowRalphResolvedDefaults => {
  const file = loadWorkflowRalphDefaultsFileV1(cwd);
  const envLayer = readWorkflowRalphConfigEnv(env);

  const backend = envLayer.backend ?? file.backend ?? DEFAULT_RALPH_RUNNER;

  const promptFile = envLayer.promptFile ?? file.promptFile;
  const namedPrompt = envLayer.prompt ?? file.prompt ?? DEFAULT_RALPH_PROMPT;
  assertPromptLayersCompatible(promptFile, namedPrompt);

  const iterations =
    envLayer.iterations ?? file.iterations ?? DEFAULT_RALPH_ITERATIONS;
  const iterationTimeout = envLayer.iterationTimeout ?? file.iterationTimeout;
  const model = envLayer.model ?? file.model ?? DEFAULT_RALPH_MODEL;
  const projectRaw = envLayer.project ?? file.project;
  const project =
    projectRaw !== undefined && projectRaw.trim() !== ''
      ? projectRaw.trim()
      : undefined;

  return {
    backend,
    debug: envLayer.debug ?? file.debug ?? DEFAULT_DEBUG,
    diagnostics: mergeDiagnostics(file.diagnostics, envLayer.diagnostics),
    iterationTimeout,
    iterations,
    lifecycleHooksChildJobs:
      envLayer.lifecycleHooksChildJobs ??
      file.lifecycleHooksChildJobs ??
      DEFAULT_LIFECYCLE_HOOKS_CHILD_JOBS,
    model,
    project,
    prompt: namedPrompt,
    promptFile,
    skipWorktreeSetup: envLayer.skipWorktreeSetup ?? file.skipWorktreeSetup,
    spawn: mergeSpawn(file.spawn, envLayer.spawn),
    taskIterations: envLayer.taskIterations ?? file.taskIterations,
    transport: envLayer.transport ?? file.transport ?? DEFAULT_TRANSPORT,
    worktree: envLayer.worktree ?? file.worktree,
    worktreeBase: envLayer.worktreeBase ?? file.worktreeBase,
  };
};

/**
 * @description Resolves Ralph OpenThrottle I/O transport from merged defaults (file + env).
 */
export const resolveWorkflowRalphTransport = (
  cwd: string = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): WorkflowRalphTransport => loadWorkflowRalphConfig(cwd, env).transport;

/** @description Maps {@link WorkflowRalphDefaultsDebug} to {@link WorkflowDebugLevel}. */
export const mapDefaultsDebugToRalphDebugLevel = (
  debug: WorkflowRalphDefaultsDebug,
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
