/**
 * @description Canonical JSON shape for `plans.run_config` (version 1).
 * `planId` is implicit (`plans.id`); omit from stored JSON.
 */

import { WorkflowConfigRunner } from '@openthrottle/openthrottle-agentic-workflow';
import type { PLAN_RUN_CONFIG_VERSION } from './plan-run-config-storage.constants';

export type PlanRunConfigTargetMode = 'plan' | 'task';

export type PlanRunConfigPromptLayer = 'named' | 'file';

export type PlanRunConfigDebugCli = 'omit' | 'debug' | 'verbose';

export type PlanRunConfigWorktreeCli = 'flag-only' | 'named' | 'omit';

export type PlanRunConfigExecutionBackend = 'claude' | 'cursor';

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
  readonly worktreeCli: PlanRunConfigWorktreeCli;
  readonly worktreeName: string;
}

export interface PlanRunConfigStorageV1 {
  readonly ralph: PlanRunConfigRalphV1;
  readonly target: {
    readonly mode: PlanRunConfigTargetMode;
    readonly taskId: string;
  };
  readonly version: typeof PLAN_RUN_CONFIG_VERSION;
  readonly workspace: {
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
  readonly worktreeCli: PlanRunConfigWorktreeCli;
  readonly worktreeName: string;
}

/**
 * @description Plan Configuration tab state persisted via `run_config` (excludes `job_run_hooks`).
 */
export interface PlanWorkflowUiState {
  readonly iterationTimeoutText: string;
  readonly workflowInput: PlanWorkflowRalphRunOptions;
  readonly workingDirectory: string;
}
