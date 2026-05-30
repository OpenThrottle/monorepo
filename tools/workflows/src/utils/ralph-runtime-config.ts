/**
 * @description Layer 1 (prompt profile) and layer 3 (run tuning) defaults for workflow-ralph:
 * built-in defaults, optional repo-local `.workflow-ralph.json`, then `WORKFLOW_RALPH_*` env.
 * Precedence after merge: CLI argv overrides env overrides file over built-ins (see {@link mergeRalphRuntimeSeed}).
 */

import type { RalphExecutionBackendId } from './ralph-execution-backend';
import {
  loadWorkflowRalphConfig,
  loadWorkflowRalphDefaultsFileV1,
  normalizeWorkflowRalphDefaultsFileV1,
  readWorkflowRalphConfigEnv,
} from '../config/load-workflow-ralph-config.js';

export {
  DEFAULT_RALPH_ITERATIONS,
  DEFAULT_RALPH_MODEL,
  DEFAULT_RALPH_PROMPT,
  WORKFLOW_RALPH_ENV,
} from '../config/load-workflow-ralph-config.js';

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
  /** Cursor-only: `--skip-worktree-setup`. */
  readonly skipWorktreeSetup?: boolean;
  /** Agent CLI worktree name (same as `--worktree <name>`). */
  readonly worktree?: string;
  /** Cursor-only: `--worktree-base`. */
  readonly worktreeBase?: string;
}

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
  readonly skipWorktreeSetup: boolean | undefined;
  readonly worktree: string | undefined;
  readonly worktreeBase: string | undefined;
}

const pickRunTuningFromV1 = (
  v1: ReturnType<typeof loadWorkflowRalphDefaultsFileV1>,
): WorkflowRalphDefaultsFileJson => {
  const out: WorkflowRalphDefaultsFileJson = {};
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
  const iterationTimeoutMs =
    resolved.iterationTimeout !== undefined && resolved.iterationTimeout >= 1
      ? resolved.iterationTimeout * 1000
      : undefined;

  return {
    backend: resolved.backend,
    iterationTimeoutMs,
    iterations: resolved.iterations,
    model: resolved.model,
    project: resolved.project,
    prompt: resolved.prompt,
    promptFile: resolved.promptFile,
    skipWorktreeSetup: resolved.skipWorktreeSetup,
    worktree: resolved.worktree,
    worktreeBase: resolved.worktreeBase,
  };
}

/** @description Re-export for callers validating file JSON without reading from disk. */
export { normalizeWorkflowRalphDefaultsFileV1 };
