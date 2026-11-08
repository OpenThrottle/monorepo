import type { WORKTREE_ROOT_SOURCE } from './worktree-root.constants.ts';
export type WorktreeRootSource =
  (typeof WORKTREE_ROOT_SOURCE)[keyof typeof WORKTREE_ROOT_SOURCE];

export interface ResolveWorktreeRootParams {
  /** Absolute path of the checkout worktrees are created from. */
  readonly baseCheckoutPath: string;
  /**
   * This process's environment. Injected rather than read off `process.env` so the resolver stays
   * pure and testable.
   */
  readonly env?: NodeJS.ProcessEnv;
}

export interface ResolvedWorktreeRoot {
  /**
   * The configured root itself — absolute, `~`-expanded, trailing-slash-free — BEFORE `<org>/<repo>`
   * is joined on. What a person set (or the default), and therefore what a page should name.
   */
  readonly baseRoot: string;
  /**
   * The directory worktrees for THIS checkout are created under: {@link baseRoot} joined with the
   * checkout's `<org>/<repo>` namespace. Absolute and trailing-slash-free.
   */
  readonly resolvedRoot: string;
  readonly source: WorktreeRootSource;
}
