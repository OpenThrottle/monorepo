/**
 * @description The worktree a programmatic plan run was provisioned into, as the orchestrator
 * reports it to the worker once the run's directory is resolved.
 */

export interface ProvisionedPlanRunWorktree {
  /** Absolute path of the checkout the worktree was created from (where the ot-worktree destroy action runs). */
  readonly baseCheckoutPath: string;
  /** Absolute path of the worktree the agent works in. */
  readonly worktreePath: string;
}
export interface ProvisionPlanRunWorktreeParams {
  /** Absolute path of the checkout the worktree is created from. */
  readonly baseCheckoutPath: string;
  /** Worktree name (also the branch, as `openthrottle/<name>`). */
  readonly worktreeName: string;
}
