/**
 * @description Canonical JSON shape for `plan_runs.run_config_snapshot` (version 1).
 * Captures the resolved configuration actually enqueued, not the plan defaults column.
 */

import type { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from './plan-run-config-snapshot.constants.ts';
import type {
  PlanJobRunHooksStorage,
  PlanRunConfigTargetMode,
} from './plan-run-config-storage.types.ts';
import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

export type PlanRunConfigSnapshotDebugCli = 'debug' | 'omit' | 'verbose';

/**
 * @description Resolved Ralph tuning at enqueue (argv-equivalent nested flags).
 */
export interface PlanRunConfigSnapshotRalphV1 {
  readonly debug?: PlanRunConfigSnapshotDebugCli;
  readonly executionBackend: WorkflowConfigRunner;
  readonly iterationTimeoutSeconds?: number;
  readonly iterations?: number;
  readonly model?: string;
  readonly project?: string;
  readonly prompt?: string;
  readonly promptFile?: string;
  readonly skipWorktreeSetup?: boolean;
  readonly worktree?: string;
  readonly worktreeBase?: string;
}

export interface PlanRunConfigSnapshotV1 {
  readonly jobRunHooks?: PlanJobRunHooksStorage;
  readonly ralph: PlanRunConfigSnapshotRalphV1;
  readonly target: {
    readonly mode: PlanRunConfigTargetMode;
    readonly taskId: string;
  };
  readonly version: typeof PLAN_RUN_CONFIG_SNAPSHOT_VERSION;
  readonly workspace: {
    readonly workingDirectory: string;
  };
}

export type PlanRunConfigSnapshot = PlanRunConfigSnapshotV1;

/**
 * @description Input for building a snapshot from validated BullMQ job data at enqueue.
 */
export interface BuildPlanRunConfigSnapshotInput {
  readonly executionBackend: WorkflowConfigRunner;
  readonly jobRunHooks?: PlanJobRunHooksStorage | null;
  readonly mode?: PlanRunConfigTargetMode | null;
  readonly ralph?: {
    readonly debug?: PlanRunConfigSnapshotDebugCli | null;
    readonly iterationTimeoutSeconds?: number | null;
    readonly iterations?: number | null;
    readonly model?: string | null;
    readonly project?: string | null;
    readonly prompt?: string | null;
    readonly promptFile?: string | null;
    readonly skipWorktreeSetup?: boolean | null;
    readonly worktree?: string | null;
    readonly worktreeBase?: string | null;
  } | null;
  readonly taskId?: string | null;
  readonly workingDirectory?: string | null;
}
