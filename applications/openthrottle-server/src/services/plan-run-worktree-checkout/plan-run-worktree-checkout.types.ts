export interface RegisterPlanRunWorktreeCheckoutParams {
  /** Absolute filesystem path of the resolved worktree for this run. */
  readonly filesystemPath: string;
  readonly planRunId: string;
  /** Authenticated user id (JWT `sub`); owns the checkout row. */
  readonly userId: string;
}
