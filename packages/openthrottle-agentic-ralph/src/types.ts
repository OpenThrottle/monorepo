import type { ConversationReasoningEffort } from '@openthrottle/openthrottle-agentic-utils';
import type {
  WorkflowConfigLegacy,
  WorkflowConfigRunner,
  WorkflowCorrelation,
  WorkflowLifecycleDispatcher,
} from '@openthrottle/openthrottle-agentic-workflow';

import type { WorkflowRalphUsageLimit } from './contract/ralph-orchestrator-deps.ts';

export type WorkflowFinishedReason =
  | 'workflow_budget_exhausted'
  | 'workflow_complete'
  | 'workflow_complete_handoff_owed'
  | 'workflow_cancelled'
  | 'workflow_max_iterations'
  | 'workflow_plan_already_terminal'
  | 'workflow_tasks_exhausted'
  | 'workflow_usage_limited';

export type WorkflowFailedReason =
  'workflow_agent_error' | 'workflow_input_required' | 'workflow_unhandled';

/**
 * @description Fields aligned with the developer app’s `WorkflowRalphRunOptionsInput` (argv / form).
 * {@link WorkflowRalphContext} extends this shape plus orchestration-only fields (`kind`, `mode`,
 * `iterations`).
 */
export interface WorkflowContext extends WorkflowConfigLegacy {
  /**
   * When set (e.g. BullMQ worker + in-process abort controller), forwarded to each iteration and
   * checked between steps so user cancel matches the spawn-path behavior.
   */
  readonly abortSignal?: AbortSignal;

  /**
   * Optional tracing metadata from {@link WorkflowCorrelation}; forwarded with the context for
   * application-layer structured logs (no plan/task ids at the shared-contract layer).
   */
  readonly correlation?: WorkflowCorrelation;

  /**
   * Reasoning effort for the run (chat vocabulary), carried from the enqueue tuning (`ralph.effort`).
   * Forwarded to every iteration, where each backend maps it to its own flag or ignores it.
   */
  readonly effort?: ConversationReasoningEffort;

  /**
   * @description Names of OpenThrottle curated skills materialized into the foreign target repo for
   * this run (server-scoped foreign-skill injection). Surfaced in the foreign-workspace prompt layer
   * so the agent knows the skills are genuinely available. Empty/omitted when not a foreign run or
   * nothing was injected.
   */
  readonly injectedSkillNames?: readonly string[];

  /**
   * Durable cancel-marker poll (Channel 1). When provided, the run loop awaits this at the same
   * iteration boundaries it checks {@link abortSignal}; a truthy result stops the run
   * (`workflow_cancelled`). This is the cross-process/host/CLI guarantee: even if the low-latency
   * Redis pub/sub signal was missed, the owning process still observes the persisted cancel request
   * at its next boundary. Kept as an injected callback so this package stays storage-agnostic — the
   * server backs it with `plan_runs.cancel_requested_at`, the CLI with its own reader. A thrown or
   * rejected check is treated as "not cancelled" so a transient read failure never crashes the run.
   */
  readonly isCancellationRequested?: () => boolean | Promise<boolean>;

  // 🤠 - agentic ralph workflow specifics
  readonly kind: 'ralph';
  /**
   * Optional Jest-style lifecycle hook dispatcher (BullMQ child jobs on the orchestrator path).
   * When omitted, hook boundary calls are no-ops.
   */
  readonly lifecycleDispatcher?: WorkflowLifecycleDispatcher;
  readonly mode: 'plan' | 'task';
  readonly planId: string;
  readonly project: string | undefined;
  readonly runner: WorkflowConfigRunner;
  readonly skipWorktreeSetup: boolean | undefined;
  readonly taskId: string;
  /**
   * @description Work-ledger run session id (opened by the plans worker for this run). When set, the
   * orchestrator sends it as an `X-OT-Session-Id` header on its status-mutating GraphQL calls so the
   * server-side capture attaches the run's task/plan status_change artifacts to this session
   * instead of spawning per-mutation instant sessions — provided the session's actor matches the
   * request principal (G11 in docs/monorepo/work-ledger-sessions.md). Omitted for CLI/dev paths.
   */
  readonly workSessionId?: string;
  /**
   * @description Absolute path to the target repository cwd for agent iterations (foreign checkout).
   * When omitted, the host process cwd is used (typically the OpenThrottle monorepo root).
   */
  readonly workingDirectory?: string;
  readonly worktree: string | undefined;
  readonly worktreeBase: string | undefined;
}

/**
 * @description A run that stopped cleanly because the agent account hit a subscription usage limit.
 * Carries the limit (reset time included) so the host can schedule a resume. Exit code 0: nothing
 * went wrong with the run itself, it is only paused.
 */
export interface WorkflowUsageLimitedResult {
  readonly exitCode: 0;
  readonly reason: 'workflow_usage_limited';
  readonly status: 'finished';
  readonly usageLimit: WorkflowRalphUsageLimit;
}

/**
 * @description A clean finish that may carry settle artifacts from the host-owned push/PR
 * finalize step. `headSha` / `prNumber` are present when that step pushed and opened (or reused)
 * a PR; omitted when finalize was skipped (no commits ahead) or never ran. The plans worker
 * records work-ledger git_commit + pull_request artifacts from these fields on COMPLETED settle.
 */
export interface WorkflowFinishedResult {
  readonly exitCode: 0;
  readonly headSha?: string;
  readonly prNumber?: number;
  readonly reason: Exclude<WorkflowFinishedReason, 'workflow_usage_limited'>;
  readonly status: 'finished';
}

/**
 * @description Terminal outcome of a workflow run (process exit semantics
 * align with current Ralph CLI). Narrow on `reason === 'workflow_usage_limited'` to read
 * `usageLimit`; finished results may carry optional settle artifacts from plan-end finalize.
 */
export type WorkflowRunResult =
  | WorkflowFinishedResult
  | WorkflowUsageLimitedResult
  | {
      readonly exitCode: 1;
      readonly reason: WorkflowFailedReason;
      readonly status: 'failed';
    };

/**
 * @description Create an Orchestrator type for Ralph workflow customized
 * with the Ralph-specific context(s) and results. Now this package can
 * implement its own Ralph orchestrator.
 */
export interface WorkflowOrchestrator {
  readonly execute: (params: {
    readonly context: WorkflowContext;
  }) => Promise<WorkflowRunResult>;
}
