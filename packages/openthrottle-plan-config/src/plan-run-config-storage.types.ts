/**
 * @description Canonical JSON shape for `plans.run_config` (version 1).
 * `planId` is implicit (`plans.id`); omit from stored JSON.
 */

import type { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';

import type { PLAN_RUN_CONFIG_VERSION } from './plan-run-config-storage.constants.ts';

export type PlanRunConfigTargetMode = 'plan' | 'task';

export type PlanRunConfigPromptLayer = 'named' | 'file';

export type PlanRunConfigDebugCli = 'omit' | 'debug' | 'verbose';

export type PlanRunConfigWorktreeCli = 'flag-only' | 'named' | 'omit';

/** @description `'on-pr'` tears the worktree down after a clean run with a PR; `'keep'` never does. */
export type PlanRunConfigWorktreeCleanup = 'keep' | 'on-pr';

export type PlanRunConfigExecutionBackend = 'claude' | 'cursor';

/** @description Runner that executes the plan run; an absent `runner` means `'ralph'`. */
export type PlanRunConfigRunner = 'ot-loop' | 'ralph';

/**
 * @description OT Loop run tuning (`runConfigJson.otLoop`). Structurally compatible with
 * `OtLoopRunTuning` in docs/workflows/ot-loop-job.md § 1. `maxRetries` is clamped 0..5 at run time.
 */
export interface PlanRunConfigOtLoop {
  readonly finalValidationCommands?: readonly string[];
  readonly maxRetries?: number;
  readonly setupCommands?: readonly string[];
  readonly validationCommands?: readonly string[];
}

/** @description Stored shape for `plans.job_run_hooks` (validated in openthrottle-server). */
export interface PlanJobRunHooksStorage {
  readonly hooks: readonly unknown[];
}

/**
 * @description UI-native Ralph tuning persisted on the plan (not GraphQL `RalphPlanRunTuningInput`).
 * Maps to {@link PlanWorkflowRalphRunOptions} / developer `WorkflowRalphRunOptionsInput`.
 */
export interface PlanRunConfigRalphV1 {
  readonly debugCli: PlanRunConfigDebugCli;
  /**
   * @description Reasoning-effort level (chat vocabulary: low|medium|high|extraHigh|max|ultra);
   * empty = unset. Validated against the backend at enqueue.
   */
  readonly effort: string;
  readonly executionBackend: WorkflowConfigRunner;
  /** @description Raw Configuration tab timeout field; empty omits `--iteration-timeout`. */
  readonly iterationTimeoutText: string;
  readonly iterations: number;
  readonly model: string;
  readonly project: string;
  readonly prompt: string;
  readonly promptFile: string;
  readonly promptLayer: PlanRunConfigPromptLayer;
  readonly skipWorktreeSetup: boolean;
  readonly worktreeBase: string;
  readonly worktreeCleanup: PlanRunConfigWorktreeCleanup;
  readonly worktreeCli: PlanRunConfigWorktreeCli;
  readonly worktreeName: string;
}

export interface PlanRunConfigStorageV1 {
  /** @description OT Loop tuning; ignored unless `runner` is `'ot-loop'`. */
  readonly otLoop?: PlanRunConfigOtLoop;
  readonly ralph: PlanRunConfigRalphV1;
  /** @description Absent means `'ralph'`. */
  readonly runner?: PlanRunConfigRunner;
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
 * @description Workflow Ralph options for Plan Configuration (includes route `planId`).
 * Structurally aligned with developer `WorkflowRalphRunOptionsInput`.
 */
export interface PlanWorkflowRalphRunOptions {
  readonly debugCli: PlanRunConfigDebugCli;
  readonly effort: string;
  readonly executionBackend: WorkflowConfigRunner;
  readonly iterations: number;
  readonly model: string;
  readonly planId: string;
  readonly project: string;
  readonly prompt: string;
  readonly promptFile: string;
  readonly promptLayer: PlanRunConfigPromptLayer;
  readonly skipWorktreeSetup: boolean;
  readonly targetMode: PlanRunConfigTargetMode;
  readonly taskId: string;
  readonly worktreeBase: string;
  readonly worktreeCleanup: PlanRunConfigWorktreeCleanup;
  readonly worktreeCli: PlanRunConfigWorktreeCli;
  readonly worktreeName: string;
}

/**
 * @description Plan Configuration tab state persisted via `run_config` (excludes `job_run_hooks`).
 */
export interface PlanWorkflowUiState {
  /** @description Registered checkout id selected in the UI (optional; empty/absent = unset). */
  readonly checkoutId?: string;
  readonly iterationTimeoutText: string;
  /** @description Carried through so a UI save does not drop it. */
  readonly otLoop?: PlanRunConfigOtLoop;
  /** @description Registered repository id selected in the UI (optional; empty/absent = unset). */
  readonly repositoryId?: string;
  /** @description Carried through so a UI save does not drop it. */
  readonly runner?: PlanRunConfigRunner;
  readonly workflowInput: PlanWorkflowRalphRunOptions;
  readonly workingDirectory: string;
}
