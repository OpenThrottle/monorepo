/**
 * @description Layer 1 (prompt profile) and layer 3 (run tuning) defaults for workflow-ralph:
 * built-in defaults, optional repo-local `.workflow-ralph.json`, then `WORKFLOW_RALPH_*` env.
 * Precedence after merge: CLI argv overrides env overrides file over built-ins (see {@link mergeRalphRuntimeSeed}).
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import {
  loadWorkflowRalphConfig,
  loadWorkflowRalphDefaultsFileV1,
  normalizeWorkflowRalphDefaultsFileV1,
  readWorkflowRalphConfigEnv,
} from '../config/load-workflow-ralph-config.ts';
import type { Writable } from '../type';

export {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  WORKFLOW_RALPH_ENV,
} from '../config/load-workflow-ralph-config.ts';

/** Repo-local JSON file (cwd); optional. */
export const WORKFLOW_RALPH_DEFAULTS_FILE = '.workflow-ralph.json' as const;

/**
 * @description Largest delay Node's timers accept (`2^31 - 1` ms, ~24.8 days).
 * Anything above this silently overflows `setTimeout` back to ~1ms, so an
 * iteration timeout would fire almost immediately with a misleading message.
 */
export const MAX_ITERATION_TIMEOUT_MS = 2_147_483_647 as const;

/** @description Upper bound for `--iteration-timeout` in **seconds**, derived from {@link MAX_ITERATION_TIMEOUT_MS}. */
export const MAX_ITERATION_TIMEOUT_SECONDS = Math.floor(
  MAX_ITERATION_TIMEOUT_MS / 1000,
);

/**
 * @description Validates an iteration timeout in **seconds** and converts it to milliseconds.
 * Rejects non-positive values and any value whose millisecond product would overflow
 * Node's `setTimeout` range (see {@link MAX_ITERATION_TIMEOUT_MS}). Returns `undefined`
 * for `undefined`/`< 1` inputs so callers can treat "unset" uniformly.
 *
 * @throws if `seconds` is positive but `seconds * 1000` exceeds {@link MAX_ITERATION_TIMEOUT_MS}.
 */
export function resolveIterationTimeoutMs(
  seconds: number | undefined,
): number | undefined {
  if (seconds === undefined || seconds < 1) {
    return undefined;
  }

  const ms = seconds * 1000;
  if (ms > MAX_ITERATION_TIMEOUT_MS) {
    throw new Error(
      `--iteration-timeout must be <= ${MAX_ITERATION_TIMEOUT_SECONDS} seconds (Node timer limit); got ${seconds}`,
    );
  }

  return ms;
}

/**
 * @description Subset of fields allowed in `.workflow-ralph.json` (same semantics as env).
 * `iterationTimeout` is in **seconds** (matches CLI `--iteration-timeout`).
 */
export interface WorkflowRalphDefaultsFileJson {
  readonly backend?: WorkflowConfigRunner;
  readonly iterationTimeout?: number;
  readonly iterations?: number;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
  /** Repo-relative or absolute path; file body is the prompt (mutually exclusive with `prompt` in file). */
  readonly promptFile?: string;
  /** Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup?: boolean;
  /**
   * Opt-in task-mode iteration override (same as `--task-iterations <n>` /
   * `WORKFLOW_RALPH_TASK_ITERATIONS`). Unset keeps the single-task rule (effective 1).
   */
  readonly taskIterations?: number;
  /** Agent CLI worktree name (same as `--worktree <name>`). */
  readonly worktree?: string;
  /** Cursor-only: `--worktree-base`. */
  readonly worktreeBase?: string;
}

/**
 * @description Seed for argv parsing before CLI flags are applied.
 */
export interface RalphRuntimeSeed {
  readonly backend: WorkflowConfigRunner;
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
  readonly skipWorktreeSetup: boolean | undefined;
  /** Opt-in task-mode iteration override; `undefined` keeps the single-task rule (effective 1). */
  readonly taskIterations: number | undefined;
  readonly worktree: string | undefined;
  readonly worktreeBase: string | undefined;
}

const pickRunTuningFromV1 = (
  v1: ReturnType<typeof loadWorkflowRalphDefaultsFileV1>,
): WorkflowRalphDefaultsFileJson => {
  const out: Writable<WorkflowRalphDefaultsFileJson> = {};

  if (v1.backend !== undefined) {
    out.backend = v1.backend;
  }
  if (v1.iterationTimeout !== undefined) {
    out.iterationTimeout = v1.iterationTimeout;
  }
  if (v1.iterations !== undefined) {
    out.iterations = v1.iterations;
  }
  if (v1.model !== undefined) {
    out.model = v1.model;
  }
  if (v1.project !== undefined) {
    out.project = v1.project;
  }
  if (v1.prompt !== undefined) {
    out.prompt = v1.prompt;
  }
  if (v1.promptFile !== undefined) {
    out.promptFile = v1.promptFile;
  }
  if (v1.skipWorktreeSetup !== undefined) {
    out.skipWorktreeSetup = v1.skipWorktreeSetup;
  }
  if (v1.taskIterations !== undefined) {
    out.taskIterations = v1.taskIterations;
  }
  if (v1.worktree !== undefined) {
    out.worktree = v1.worktree;
  }
  if (v1.worktreeBase !== undefined) {
    out.worktreeBase = v1.worktreeBase;
  }
  return out;
};

/**
 * @description Loads optional `.workflow-ralph.json` from `cwd`. Missing file returns `{}`.
 */
export function loadWorkflowRalphDefaultsFile(
  cwd: string,
): WorkflowRalphDefaultsFileJson {
  return pickRunTuningFromV1(loadWorkflowRalphDefaultsFileV1(cwd));
}

/**
 * @description Reads `WORKFLOW_RALPH_*` env vars for prompt and run tuning.
 */
export function readWorkflowRalphEnv(): WorkflowRalphDefaultsFileJson {
  return pickRunTuningFromV1(readWorkflowRalphConfigEnv());
}

/**
 * @description Merges built-in defaults, optional file (`cwd`), and env.
 * Order: **env overrides file** over built-ins. CLI parsing applies on top (see {@link parseRalphArgs}).
 */
export function mergeRalphRuntimeSeed(cwd: string): RalphRuntimeSeed {
  const resolved = loadWorkflowRalphConfig(cwd);
  const iterationTimeoutMs = resolveIterationTimeoutMs(
    resolved.iterationTimeout,
  );

  return {
    backend: resolved.backend,
    iterationTimeoutMs,
    iterations: resolved.iterations,
    model: resolved.model,
    project: resolved.project,
    prompt: resolved.prompt,
    promptFile: resolved.promptFile,
    skipWorktreeSetup: resolved.skipWorktreeSetup,
    taskIterations: resolved.taskIterations,
    worktree: resolved.worktree,
    worktreeBase: resolved.worktreeBase,
  };
}

/** @description Re-export for callers validating file JSON without reading from disk. */
export { normalizeWorkflowRalphDefaultsFileV1 };
