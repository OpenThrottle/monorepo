import type { PRUNE_WORKTREE_CHECKOUT_OUTCOME } from './worktree-checkout-prune.constants.ts';

/** The union of {@link PRUNE_WORKTREE_CHECKOUT_OUTCOME} values. */
export type PruneWorktreeCheckoutOutcome =
  (typeof PRUNE_WORKTREE_CHECKOUT_OUTCOME)[keyof typeof PRUNE_WORKTREE_CHECKOUT_OUTCOME];

/**
 * The outcome of deregistering by PATH — what a teardown script knows. `checkoutId` is null when
 * no checkout is registered at the path for the caller (NOT_FOUND), which is the normal case for
 * a worktree OpenThrottle never registered.
 */
export interface DeregisterWorktreeCheckoutResult {
  readonly checkoutId: string | null;
  readonly outcome: PruneWorktreeCheckoutOutcome;
  readonly path: string;
}

export interface PruneWorktreeCheckoutResult {
  readonly checkoutId: string;
  readonly outcome: PruneWorktreeCheckoutOutcome;
  /** The registered path, or null when the checkout was not found. */
  readonly path: string | null;
}
