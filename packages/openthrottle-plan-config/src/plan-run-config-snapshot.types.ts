/**
 * @description Canonical JSON shape for `plan_runs.run_config_snapshot` (version 1).
 * Captures the resolved configuration actually enqueued, not the plan defaults column.
 */

import type { DriversValue } from '@openthrottle/openthrottle-drivers';

import type { PLAN_RUN_CONFIG_SNAPSHOT_VERSION } from './plan-run-config-snapshot.constants.ts';
import type {
  PlanJobRunHooksStorage,
  PlanRunConfigOtLoop,
  PlanRunConfigTargetMode,
} from './plan-run-config-storage.types.ts';

export type PlanRunConfigSnapshotDebugCli = 'debug' | 'omit' | 'verbose';

/**
 * @description Resolved run tuning at enqueue: the driver plus what the run was enqueued with, and
 * the OT Loop validation fields.
 */
export interface PlanRunConfigSnapshotRunV1 extends PlanRunConfigOtLoop {
  readonly debug?: PlanRunConfigSnapshotDebugCli;
  readonly driver: DriversValue;
  /** @description Reasoning-effort level (chat vocabulary: low|medium|high|extraHigh|max|ultra), validated at enqueue. */
  readonly effort?: string;
  readonly iterationTimeoutSeconds?: number;
  readonly model?: string;
  /** @description The worktree the run executes in (the enqueue derives `plan-<short plan id>` unless overridden). */
  readonly worktreeName?: string;
}

export interface PlanRunConfigSnapshotV1 {
  readonly jobRunHooks?: PlanJobRunHooksStorage;
  readonly run: PlanRunConfigSnapshotRunV1;
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
  readonly driver: DriversValue;
  readonly jobRunHooks?: PlanJobRunHooksStorage | null;
  readonly mode?: PlanRunConfigTargetMode | null;
  readonly otLoop?: PlanRunConfigOtLoop | null;
  readonly repositoryId?: string | null;
  readonly taskId?: string | null;
  readonly tuning?: {
    readonly debug?: PlanRunConfigSnapshotDebugCli | null;
    readonly effort?: string | null;
    readonly iterationTimeoutSeconds?: number | null;
    readonly model?: string | null;
    readonly worktreeName?: string | null;
  } | null;
  readonly workingDirectory?: string | null;
}
