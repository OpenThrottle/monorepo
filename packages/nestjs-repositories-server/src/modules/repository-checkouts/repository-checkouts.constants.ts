/**
 * @description The kinds a repository checkout can have: the user's own clone (`primary`) or
 * a git worktree provisioned from one (`worktree`).
 * @public
 */
export const REPOSITORY_CHECKOUT_KINDS = ['primary', 'worktree'] as const;
