import type {
  AgentAccountError,
  UsageLimit,
} from '@openthrottle/openthrottle-drivers';

/**
 * @description Why a plan run finished cleanly (exit code 0).
 * @public
 */
export type WorkflowFinishedReason =
  | 'workflow_budget_exhausted'
  | 'workflow_complete'
  | 'workflow_complete_handoff_owed'
  | 'workflow_cancelled'
  | 'workflow_max_iterations'
  | 'workflow_plan_already_terminal'
  | 'workflow_tasks_blocked'
  | 'workflow_tasks_exhausted'
  | 'workflow_usage_limited';

/**
 * @description Why a plan run failed (exit code 1).
 * @public
 */
export type WorkflowFailedReason =
  | 'workflow_agent_account_error'
  | 'workflow_agent_error'
  | 'workflow_input_required'
  | 'workflow_unhandled';

/**
 * @description A run that stopped cleanly because the agent account hit a subscription usage limit.
 * Carries the limit (reset time included) so the host can schedule a resume. Exit code 0: nothing
 * went wrong with the run itself, it is only paused.
 * @public
 */
export interface WorkflowUsageLimitedResult {
  readonly exitCode: 0;
  readonly reason: 'workflow_usage_limited';
  readonly status: 'finished';
  readonly usageLimit: UsageLimit;
}

/**
 * @description A run stopped after one iteration because the agent's account cannot serve requests
 * (no credit, a bad key, no access). Terminal: unlike a usage limit nothing lifts on its own, so
 * the host settles it FAILED and never resumes it. `description` is the operator-readable line
 * (error, credential, fix) already written to plan output; hosts persist it as the run's settled
 * reason.
 * @public
 */
export interface WorkflowAccountErrorResult {
  readonly accountError: AgentAccountError;
  readonly description: string;
  readonly exitCode: 1;
  readonly reason: 'workflow_agent_account_error';
  readonly status: 'failed';
}

/**
 * @description A clean finish that may carry settle artifacts from the host-owned push/PR
 * finalize step. `headSha` / `prNumber` are present when that step pushed and opened (or reused)
 * a PR; omitted when finalize was skipped (no commits ahead) or never ran. The plans worker
 * records work-ledger git_commit + pull_request artifacts from these fields on COMPLETED settle.
 * @public
 */
export interface WorkflowFinishedResult {
  readonly exitCode: 0;
  readonly headSha?: string;
  readonly prNumber?: number;
  readonly reason: Exclude<WorkflowFinishedReason, 'workflow_usage_limited'>;
  readonly status: 'finished';
}

/**
 * @description Terminal outcome of a plan run (process exit semantics: 0 finished, non-zero otherwise).
 * Narrow on `reason === 'workflow_usage_limited'` to read `usageLimit`; finished results may carry
 * optional settle artifacts from plan-end finalize.
 * @public
 */
export type WorkflowRunResult =
  | WorkflowAccountErrorResult
  | WorkflowFinishedResult
  | WorkflowUsageLimitedResult
  | {
      readonly exitCode: 1;
      readonly reason: Exclude<
        WorkflowFailedReason,
        'workflow_agent_account_error'
      >;
      readonly status: 'failed';
    };
