/**
 * Canonical TypeScript shapes for `.workflow-ralph.json` (v1).
 * JSON Schema: `tools/workflows/schemas/workflow-ralph.defaults.schema.json`.
 * Loader merge and env mapping: {@link loadWorkflowRalphConfig} in `load-workflow-ralph-config.ts`.
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type { WorkflowRalphTransport } from '../utils/workflow-transport.js';

/**
 * Debug shim level aligned with {@link WorkflowDebug} in openthrottle-workflows.
 */
export type WorkflowRalphDefaultsDebug = 'debug' | 'omit' | 'verbose';

/**
 * Nested spawn tuning (worker → child workflow-ralph). Env-only secrets excluded.
 */
export interface WorkflowRalphDefaultsSpawnJson {
  readonly home?: string;
  readonly otRoot?: string;
  readonly xdgConfigHome?: string;
}

/**
 * Opt-in diagnostics flags.
 */
export interface WorkflowRalphDefaultsDiagnosticsJson {
  readonly ot?: boolean;
  readonly spawn?: boolean;
}

/**
 * Full v1 defaults file shape. Superset of {@link WorkflowRalphDefaultsFileJson}
 * in `ralph-runtime-config.ts` (run tuning only today).
 */
export interface WorkflowRalphDefaultsFileV1Json {
  readonly backend?: WorkflowConfigRunner;
  readonly debug?: WorkflowRalphDefaultsDebug;
  readonly diagnostics?: WorkflowRalphDefaultsDiagnosticsJson;
  readonly iterationTimeout?: number;
  readonly iterations?: number;
  readonly lifecycleHooksChildJobs?: boolean;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
  readonly promptFile?: string;
  readonly skipWorktreeSetup?: boolean;
  readonly spawn?: WorkflowRalphDefaultsSpawnJson;
  /**
   * Opt-in override for the max iterations in **task-centric** mode. Default (unset) keeps the
   * single-task rule (effective iterations = 1). When set to a positive integer, task mode honors
   * it instead of forcing 1. Ignored in plan mode (use `iterations` there).
   */
  readonly taskIterations?: number;
  readonly transport?: WorkflowRalphTransport;
  readonly worktree?: string;
  readonly worktreeBase?: string;
}

/**
 * Result of merging built-ins + file + env (before CLI / enqueue overrides).
 * Implementation: {@link loadWorkflowRalphConfig}.
 */
export interface WorkflowRalphResolvedDefaults extends Required<
  Pick<
    WorkflowRalphDefaultsFileV1Json,
    'backend' | 'debug' | 'iterations' | 'model' | 'prompt'
  >
> {
  readonly diagnostics: WorkflowRalphDefaultsDiagnosticsJson;
  readonly iterationTimeout: number | undefined;
  readonly lifecycleHooksChildJobs: boolean;
  readonly project: string | undefined;
  readonly promptFile: string | undefined;
  readonly skipWorktreeSetup: boolean | undefined;
  readonly spawn: WorkflowRalphDefaultsSpawnJson;
  /** Opt-in task-mode iteration override; `undefined` keeps the single-task rule (effective 1). */
  readonly taskIterations: number | undefined;
  readonly transport: WorkflowRalphTransport;
  readonly worktree: string | undefined;
  readonly worktreeBase: string | undefined;
}

/**
 * Repo-local defaults filename (cwd).
 */
export const WORKFLOW_RALPH_DEFAULTS_FILENAME = `.workflow-ralph.json`;

/**
 * Sample defaults filename at repo root (documentation only).
 */
export const WORKFLOW_RALPH_DEFAULTS_EXAMPLE_FILENAME = `.workflow-ralph.json.example`;

/**
 * Precedence documentation string; keep aligned with CLI `--help` and READMEs.
 */
export const WORKFLOW_RALPH_CONFIG_PRECEDENCE = `CLI flags → environment variables → .workflow-ralph.json → built-in defaults`;
