/**
 * @description Canonical TypeScript shapes for `.workflow-ralph.json` (v1).
 * JSON Schema: `tools/workflows/schemas/workflow-ralph.defaults.schema.json`.
 * Loader merge and env mapping: {@link loadWorkflowRalphConfig} in `load-workflow-ralph-config.ts`.
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type { WorkflowRalphTransport } from '../utils/workflow-transport.js';

/** @description Debug shim level aligned with {@link WorkflowDebug} in openthrottle-workflows. */
export type WorkflowRalphDefaultsDebug = 'debug' | 'omit' | 'verbose';

/** @description Nested spawn tuning (worker → child workflow-ralph). Env-only secrets excluded. */
export interface WorkflowRalphDefaultsSpawnJson {
  readonly home?: string;
  readonly otRoot?: string;
  readonly xdgConfigHome?: string;
}

/** @description Opt-in diagnostics flags. */
export interface WorkflowRalphDefaultsDiagnosticsJson {
  readonly ot?: boolean;
  readonly spawn?: boolean;
}

/**
 * @description Full v1 defaults file shape. Superset of {@link WorkflowRalphDefaultsFileJson}
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
  readonly transport?: WorkflowRalphTransport;
  readonly worktree?: string;
  readonly worktreeBase?: string;
}

/**
 * @description Result of merging built-ins + file + env (before CLI / enqueue overrides).
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
  readonly transport: WorkflowRalphTransport;
  readonly worktree: string | undefined;
  readonly worktreeBase: string | undefined;
}

/** @description Repo-local defaults filename (cwd). */
export const WORKFLOW_RALPH_DEFAULTS_FILENAME = '.workflow-ralph.json' as const;

/** @description Sample defaults filename at repo root (documentation only). */
export const WORKFLOW_RALPH_DEFAULTS_EXAMPLE_FILENAME =
  '.workflow-ralph.json.example' as const;

/**
 * @description Precedence documentation string; keep aligned with CLI `--help` and READMEs.
 */
export const WORKFLOW_RALPH_CONFIG_PRECEDENCE =
  'CLI flags → environment variables → .workflow-ralph.json → built-in defaults' as const;
