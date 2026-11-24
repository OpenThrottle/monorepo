/**
 * @description Canonical JSON shape for `plans.run_config` (version 1).
 * `planId` is implicit (`plans.id`); omit from stored JSON.
 */

import type { DriverId } from '@openthrottle/openthrottle-drivers';

import type { PLAN_RUN_CONFIG_VERSION } from './plan-run-config-storage.constants.ts';

export type PlanRunConfigTargetMode = 'plan' | 'task';

export type PlanRunConfigDebugCli = 'omit' | 'debug' | 'verbose';

/** @description `'on-pr'` tears the worktree down after a clean run with a PR; `'keep'` never does. */
export type PlanRunConfigWorktreeCleanup = 'keep' | 'on-pr';

export type PlanRunConfigDriver = 'claude' | 'cursor';

/**
 * @description OT Loop validation fields of the run block. Structurally compatible with
 * `OtLoopRunTuning` in docs/workflows/ot-loop-job.md § 1. `maxRetries` is clamped 0..5 at run time.
 */
export interface PlanRunConfigOtLoop {
  readonly finalValidationCommands?: readonly string[];
  readonly maxRetries?: number;
  readonly setupCommands?: readonly string[];
  readonly validationCommands?: readonly string[];
}

/** @description Filesystem boundary for an unattended run. */
export type PlanRunContainmentFilesystem = 'unrestricted' | 'worktree-write';

/** @description Network boundary for an unattended run; `hosts` exists only on an allowlist. */
export type PlanRunContainmentNetwork =
  | { readonly hosts: readonly string[]; readonly mode: 'allowlist' }
  | { readonly mode: 'deny' }
  | { readonly mode: 'unrestricted' };

/**
 * @description OT-owned containment for an unattended run (`runConfigJson.containment`), enforced
 * through each agent CLI's native sandbox. A driver that cannot honour an axis warns at run start;
 * it never fails the run. Absent on a stored config means the default profile.
 */
export interface PlanRunContainmentProfile {
  readonly filesystem: PlanRunContainmentFilesystem;
  readonly network: PlanRunContainmentNetwork;
}

/** @description Stored shape for `plans.job_run_hooks` (validated in openthrottle-server). */
export interface PlanJobRunHooksStorage {
  readonly hooks: readonly unknown[];
}

/**
 * @description The plan's saved run tuning (`runConfigJson.run`): the shared tuning fields plus the
 * OT Loop validation fields. Maps to {@link PlanWorkflowRunOptions} in the developer app.
 */
export interface PlanRunConfigRunV1 extends PlanRunConfigOtLoop {
  readonly debugCli: PlanRunConfigDebugCli;
  readonly driver: DriverId;
  /**
   * @description Reasoning-effort level (chat vocabulary: low|medium|high|extraHigh|max|ultra);
   * empty = unset. Validated against the driver at enqueue.
   */
  readonly effort: string;
  /** @description Per-attempt agent timeout in seconds; absent means no timeout. */
  readonly iterationTimeoutSeconds?: number;
  readonly model: string;
  readonly worktreeCleanup: PlanRunConfigWorktreeCleanup;
  /** @description Worktree name override; empty means "derive `plan-<short plan id>` at enqueue". */
  readonly worktreeName: string;
}

export interface PlanRunConfigStorageV1 {
  /** @description Containment profile; absent means the default (see `resolvePlanRunContainmentProfile`). */
  readonly containment?: PlanRunContainmentProfile;
  readonly run: PlanRunConfigRunV1;
  readonly target: {
    readonly mode: PlanRunConfigTargetMode;
    readonly taskId: string;
  };
  readonly version: typeof PLAN_RUN_CONFIG_VERSION;
  readonly workspace: {
    /**
     * @description Explicit registered checkout id (highest precedence). Empty when unset.
     * Resolved to a filesystem path at enqueue; see the enqueue resolution order.
     */
    readonly checkoutId: string;
    /**
     * @description Portable repository intent, resolved to the enqueuing user's checkout at
     * enqueue (used when `checkoutId` is empty). Empty when unset.
     */
    readonly repositoryId: string;
    readonly workingDirectory: string;
  };
}

export type PlanRunConfigStorage = PlanRunConfigStorageV1;

/**
 * @description Run options for Plan Configuration (includes route `planId`).
 * Structurally aligned with the developer app's `PlanRunOptions`.
 */
export interface PlanWorkflowRunOptions {
  readonly debugCli: PlanRunConfigDebugCli;
  readonly driver: DriverId;
  readonly effort: string;
  readonly model: string;
  readonly planId: string;
  readonly targetMode: PlanRunConfigTargetMode;
  readonly taskId: string;
  readonly worktreeCleanup: PlanRunConfigWorktreeCleanup;
  readonly worktreeName: string;
}

/**
 * @description Plan Configuration tab state persisted via `run_config` (excludes `job_run_hooks`).
 */
export interface PlanWorkflowUiState {
  /** @description Registered checkout id selected in the UI (optional; empty/absent = unset). */
  readonly checkoutId?: string;
  /** @description Carried through so a UI save does not drop it. */
  readonly containment?: PlanRunContainmentProfile;
  /** @description Raw timeout field (seconds); empty = no timeout. */
  readonly iterationTimeoutText: string;
  /** @description Carried through so a UI save does not drop it. */
  readonly otLoop?: PlanRunConfigOtLoop;
  /** @description Registered repository id selected in the UI (optional; empty/absent = unset). */
  readonly repositoryId?: string;
  readonly workflowInput: PlanWorkflowRunOptions;
  readonly workingDirectory: string;
}
