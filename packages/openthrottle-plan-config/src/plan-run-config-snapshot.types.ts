/**
 * @description Canonical JSON shape for `plan_runs.run_config_snapshot` (version 1).
 * Captures the resolved configuration actually enqueued, not the plan defaults column.
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

import type { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from './plan-run-config-snapshot.constants.ts';
import type {
  PlanJobRunHooksStorage,
  PlanRunConfigOtLoop,
  PlanRunConfigRunner,
  PlanRunConfigTargetMode,
} from './plan-run-config-storage.types.ts';

export type PlanRunConfigSnapshotDebugCli = 'debug' | 'omit' | 'verbose';

/**
 * @description Resolved Ralph tuning at enqueue (argv-equivalent nested flags).
 */
export interface PlanRunConfigSnapshotRalphV1 {
  readonly debug?: PlanRunConfigSnapshotDebugCli;
  /** @description Reasoning-effort level (chat vocabulary: low|medium|high|extraHigh|max|ultra), validated at enqueue. */
  readonly effort?: string;
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
  /** @description OT Loop tuning the run was enqueued with. */
  readonly otLoop?: PlanRunConfigOtLoop;
  readonly ralph: PlanRunConfigSnapshotRalphV1;
  /** @description Absent means `'ralph'`. */
  readonly runner?: PlanRunConfigRunner;
  readonly target: {
    readonly mode: PlanRunConfigTargetMode;
    readonly taskId: string;
  };
  readonly version: typeof PLAN_RUN_CONFIG_SNAPSHOT_VERSION;
  readonly workspace: {
    /** @description Registered checkout id the run was resolved from (omitted when a raw path was used). */
    readonly checkoutId?: string;
    /** @description Registered repository id the run was resolved from (omitted when unused). */
    readonly repositoryId?: string;
    /** @description The concrete resolved working directory the run actually used. */
    readonly workingDirectory: string;
  };
}

export type PlanRunConfigSnapshot = PlanRunConfigSnapshotV1;

/**
 * @description Input for building a snapshot from validated BullMQ job data at enqueue.
 */
export interface BuildPlanRunConfigSnapshotInput {
  readonly checkoutId?: string | null;
  readonly executionBackend: WorkflowConfigRunner;
  readonly jobRunHooks?: PlanJobRunHooksStorage | null;
  readonly mode?: PlanRunConfigTargetMode | null;
  readonly otLoop?: PlanRunConfigOtLoop | null;
  readonly ralph?: {
    readonly debug?: PlanRunConfigSnapshotDebugCli | null;
    readonly effort?: string | null;
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
  readonly repositoryId?: string | null;
  readonly runner?: PlanRunConfigRunner | null;
  readonly taskId?: string | null;
  readonly workingDirectory?: string | null;
}
