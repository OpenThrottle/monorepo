import type { ConversationReasoningEffort } from '../utils/conversation-backend/types.ts';
import type {
  WorkflowConfigDebug,
  WorkflowConfigRunner,
} from './workflow-config.ts';

/**
 * @description Run tuning a plan run carries in its BullMQ payload (`tuning`). All fields optional; an
 * omitted field falls through to the lower layers (env, the repo's `.openthrottle/ot-loop.json`
 * `defaults`, built-ins).
 * @public
 */
export interface PlanRunTuningSettings {
  readonly debug?: WorkflowConfigDebug;
  /**
   * Driver id ({@link WorkflowConfigRunner}). Selection applies to the **entire** run; it is not
   * switched per iteration. Omit (or pass the default) to let the lower layers resolve it.
   */
  readonly driver?: WorkflowConfigRunner | null;
  /**
   * Reasoning-effort level (chat vocabulary). Carried on job data and the run snapshot; empty or
   * omitted emits nothing.
   */
  readonly effort?: ConversationReasoningEffort | '';
  readonly iterationTimeoutSeconds?: number | null;
  readonly model?: string;
  /** Worktree name the run executes in (derived `plan-<short plan id>` unless overridden). */
  readonly worktreeName?: string | null;
}

/**
 * @description Seed for argv parsing before CLI flags are applied.
 * @public
 */
export interface PlanRunRuntimeSeed {
  readonly driver: WorkflowConfigRunner;
  readonly iterationTimeoutMs: number | undefined;
  readonly iterations: number;
  readonly model: string | undefined;
  readonly project: string | undefined;
  readonly prompt: string;
  /**
   * Optional path (cwd-relative or absolute). When set and CLI does not override with `--prompt`,
   * the UTF-8 file contents are the prompt profile (layer 1). Mutually exclusive with a non-default
   * merged `prompt` from env + file.
   */
  readonly promptFile: string | undefined;
  readonly skipWorktreeSetup: boolean | undefined;
  /** Opt-in task-mode iteration override; `undefined` keeps the single-task rule (effective 1). */
  readonly taskIterations: number | undefined;
  readonly worktree: string | undefined;
  readonly worktreeBase: string | undefined;
}
