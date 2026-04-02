/**
 * @description Layer 1 (prompt profile) and layer 3 (run tuning) defaults for workflow-ralph:
 * built-in defaults, optional repo-local `.workflow-ralph.json`, then `WORKFLOW_RALPH_*` env.
 * Precedence after merge: CLI argv overrides env overrides file over built-ins (see {@link mergeRalphRuntimeSeed}).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RalphExecutionBackendId } from './ralph-execution-backend';
import {
  parseRalphExecutionBackendId,
  WORKFLOW_RALPH_DEFAULT_BACKEND,
} from './ralph-execution-backend';

export const WORKFLOW_RALPH_DEFAULT_PROMPT = '/agents/ralph' as const;
export const WORKFLOW_RALPH_DEFAULT_ITERATIONS = 10;
export const WORKFLOW_RALPH_DEFAULT_MODEL = 'auto' as const;

/** Environment variable names for run tuning and prompt profile (Phase 1). */
export const WORKFLOW_RALPH_ENV = {
  backend: 'WORKFLOW_RALPH_BACKEND',
  iterationTimeout: 'WORKFLOW_RALPH_ITERATION_TIMEOUT',
  iterations: 'WORKFLOW_RALPH_ITERATIONS',
  model: 'WORKFLOW_RALPH_MODEL',
  project: 'WORKFLOW_RALPH_PROJECT',
  prompt: 'WORKFLOW_RALPH_PROMPT',
  /** Path to UTF-8 file whose contents become layer-1 prompt text (same as `--prompt-file`). */
  promptFile: 'WORKFLOW_RALPH_PROMPT_FILE',
} as const;

/** Repo-local JSON file (cwd); optional. */
export const WORKFLOW_RALPH_DEFAULTS_FILE = '.workflow-ralph.json' as const;

/**
 * @description Subset of fields allowed in `.workflow-ralph.json` (same semantics as env).
 * `iterationTimeout` is in **seconds** (matches CLI `--iteration-timeout`).
 */
export interface WorkflowRalphDefaultsFileJson {
  readonly backend?: RalphExecutionBackendId;
  readonly iterationTimeout?: number;
  readonly iterations?: number;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
  /** Repo-relative or absolute path; file body is the prompt (mutually exclusive with `prompt` in file). */
  readonly promptFile?: string;
}

/** @internal Mutable builder for {@link WorkflowRalphDefaultsFileJson} (TS forbids assigning to readonly props). */
type WorkflowRalphDefaultsFileDraft = Partial<{
  -readonly [K in keyof WorkflowRalphDefaultsFileJson]: WorkflowRalphDefaultsFileJson[K];
}>;

/**
 * @description Seed for argv parsing before CLI flags are applied.
 */
export interface RalphRuntimeSeed {
  readonly backend: RalphExecutionBackendId;
  readonly iterationTimeoutMs: number | undefined;
  readonly iterations: number;
  readonly model: string | undefined;
  readonly project: string | undefined;
  readonly prompt: string;
  /**
   * Optional path (cwd-relative or absolute). When set and CLI does not override with `--prompt`,
   * the UTF-8 file contents are the prompt profile (layer 1). Mutually exclusive with a non-default
   * merged `prompt` from env + file (see {@link mergeRalphRuntimeSeed}).
   */
  readonly promptFile: string | undefined;
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
  const out: WorkflowRalphDefaultsFileDraft = {};

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

  return out as WorkflowRalphDefaultsFileJson;
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
  const out: WorkflowRalphDefaultsFileDraft = {};

  const backendRaw = process.env[WORKFLOW_RALPH_ENV.backend];
  if (backendRaw !== undefined && backendRaw.trim() !== '') {
    out.backend = parseRalphExecutionBackendId(backendRaw.trim(), 'env');
  }

  const promptRaw = process.env[WORKFLOW_RALPH_ENV.prompt];
  const promptFileRaw = process.env[WORKFLOW_RALPH_ENV.promptFile];
  const hasNamed = promptRaw !== undefined && promptRaw.trim() !== '';
  const hasFile =
    promptFileRaw !== undefined && promptFileRaw.trim() !== '';
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

  return out as WorkflowRalphDefaultsFileJson;
}

/**
 * @description Merges built-in defaults, optional file (`cwd`), and env.
 * Order: **env overrides file** over built-ins. CLI parsing applies on top (see {@link parseRalphArgs}).
 */
export function mergeRalphRuntimeSeed(cwd: string): RalphRuntimeSeed {
  const file = loadWorkflowRalphDefaultsFile(cwd);
  const env = readWorkflowRalphEnv();

  const backend =
    env.backend ?? file.backend ?? WORKFLOW_RALPH_DEFAULT_BACKEND;

  const promptFile = env.promptFile ?? file.promptFile;
  const namedPrompt =
    env.prompt ?? file.prompt ?? WORKFLOW_RALPH_DEFAULT_PROMPT;
  if (
    promptFile !== undefined &&
    namedPrompt !== WORKFLOW_RALPH_DEFAULT_PROMPT
  ) {
    throw new Error(
      'Cannot combine prompt file path with a non-default named prompt in defaults (env + .workflow-ralph.json). Use only one of prompt or promptFile.',
    );
  }
  const prompt = namedPrompt;
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
    backend,
    iterationTimeoutMs,
    iterations,
    model,
    project,
    prompt,
    promptFile,
  };
}
