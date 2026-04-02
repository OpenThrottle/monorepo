/**
 * @description Layer 1 (prompt profile) and layer 3 (run tuning) defaults for workflow-ralph:
 * built-in defaults, optional repo-local `.workflow-ralph.json`, then `WORKFLOW_RALPH_*` env.
 * Precedence after merge: CLI argv overrides env overrides file over built-ins (see {@link mergeRalphRuntimeSeed}).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const WORKFLOW_RALPH_DEFAULT_PROMPT = '/agents/ralph' as const;
export const WORKFLOW_RALPH_DEFAULT_ITERATIONS = 10;
export const WORKFLOW_RALPH_DEFAULT_MODEL = 'auto' as const;

/** Environment variable names for run tuning and prompt profile (Phase 1). */
export const WORKFLOW_RALPH_ENV = {
  iterationTimeout: 'WORKFLOW_RALPH_ITERATION_TIMEOUT',
  iterations: 'WORKFLOW_RALPH_ITERATIONS',
  model: 'WORKFLOW_RALPH_MODEL',
  project: 'WORKFLOW_RALPH_PROJECT',
  prompt: 'WORKFLOW_RALPH_PROMPT',
} as const;

/** Repo-local JSON file (cwd); optional. */
export const WORKFLOW_RALPH_DEFAULTS_FILE = '.workflow-ralph.json' as const;

/**
 * @description Subset of fields allowed in `.workflow-ralph.json` (same semantics as env).
 * `iterationTimeout` is in **seconds** (matches CLI `--iteration-timeout`).
 */
export interface WorkflowRalphDefaultsFileJson {
  readonly iterationTimeout?: number;
  readonly iterations?: number;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
}

/**
 * @description Seed for argv parsing before CLI flags are applied.
 */
export interface RalphRuntimeSeed {
  readonly iterationTimeoutMs: number | undefined;
  readonly iterations: number;
  readonly model: string | undefined;
  readonly project: string | undefined;
  readonly prompt: string;
}

const isNodeErrno = (error: unknown): error is NodeJS.ErrnoException =>
  typeof error === 'object' && error !== null && 'code' in error;

const isEnoent = (error: unknown): boolean =>
  isNodeErrno(error) && error.code === 'ENOENT';

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

/**
 * @description Validates and extracts defaults from parsed JSON object content.
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeDefaultsFile = (
  parsed: unknown,
  filePath: string,
): WorkflowRalphDefaultsFileJson => {
  if (!isPlainObject(parsed)) {
    throw new Error(`${filePath} must be a JSON object`);
  }
  const o = parsed;
  const out: WorkflowRalphDefaultsFileJson = {};

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

  return out;
};

/**
 * @description Loads optional `.workflow-ralph.json` from `cwd`. Missing file returns `{}`.
 */
export function loadWorkflowRalphDefaultsFile(
  cwd: string,
): WorkflowRalphDefaultsFileJson {
  const filePath = join(cwd, WORKFLOW_RALPH_DEFAULTS_FILE);
  try {
    const raw = readFileSync(filePath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    return normalizeDefaultsFile(parsed, WORKFLOW_RALPH_DEFAULTS_FILE);
  } catch (error) {
    if (isEnoent(error)) {
      return {};
    }
    throw error;
  }
}

/**
 * @description Reads `WORKFLOW_RALPH_*` env vars for prompt and run tuning.
 */
export function readWorkflowRalphEnv(): WorkflowRalphDefaultsFileJson {
  const out: WorkflowRalphDefaultsFileJson = {};

  const promptRaw = process.env[WORKFLOW_RALPH_ENV.prompt];
  if (promptRaw !== undefined && promptRaw.trim() !== '') {
    out.prompt = promptRaw.trim();
  }

  const iterations = parsePositiveIntEnv(
    process.env[WORKFLOW_RALPH_ENV.iterations],
    WORKFLOW_RALPH_ENV.iterations,
  );
  if (iterations !== undefined) {
    out.iterations = iterations;
  }

  const iterationTimeout = parsePositiveIntEnv(
    process.env[WORKFLOW_RALPH_ENV.iterationTimeout],
    WORKFLOW_RALPH_ENV.iterationTimeout,
  );
  if (iterationTimeout !== undefined) {
    out.iterationTimeout = iterationTimeout;
  }

  const modelRaw = process.env[WORKFLOW_RALPH_ENV.model];
  if (modelRaw !== undefined && modelRaw.trim() !== '') {
    out.model = modelRaw.trim();
  }

  const projectRaw = process.env[WORKFLOW_RALPH_ENV.project];
  if (projectRaw !== undefined && projectRaw.trim() !== '') {
    out.project = projectRaw.trim();
  }

  return out;
}

/**
 * @description Merges built-in defaults, optional file (`cwd`), and env.
 * Order: **env overrides file** over built-ins. CLI parsing applies on top (see {@link parseRalphArgs}).
 */
export function mergeRalphRuntimeSeed(cwd: string): RalphRuntimeSeed {
  const file = loadWorkflowRalphDefaultsFile(cwd);
  const env = readWorkflowRalphEnv();

  const prompt = env.prompt ?? file.prompt ?? WORKFLOW_RALPH_DEFAULT_PROMPT;
  const iterations =
    env.iterations ?? file.iterations ?? WORKFLOW_RALPH_DEFAULT_ITERATIONS;
  const iterationTimeoutSeconds = env.iterationTimeout ?? file.iterationTimeout;
  const iterationTimeoutMs =
    iterationTimeoutSeconds !== undefined && iterationTimeoutSeconds >= 1
      ? iterationTimeoutSeconds * 1000
      : undefined;
  const model = env.model ?? file.model ?? WORKFLOW_RALPH_DEFAULT_MODEL;
  const projectRaw = env.project ?? file.project;
  const project =
    projectRaw !== undefined && projectRaw.trim() !== ''
      ? projectRaw.trim()
      : undefined;

  return {
    iterationTimeoutMs,
    iterations,
    model,
    project,
    prompt,
  };
}
