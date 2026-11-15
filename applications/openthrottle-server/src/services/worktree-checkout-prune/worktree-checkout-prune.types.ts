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

/**
 * The removal audit a teardown sends with a post-removal deregistration, as it arrives: every
 * field untrusted and possibly null. Normalized by `normalizeWorktreeRemovalAudit` before storage.
 */
export interface WorktreeRemovalAudit {
  readonly agentSession: string | null | undefined;
  readonly ancestry: string | null | undefined;
  readonly branch: string | null | undefined;
  readonly parent: string | null | undefined;
  readonly pid: number | null | undefined;
  readonly ppid: number | null | undefined;
  readonly probe: string | null | undefined;
  readonly result: string | null | undefined;
  readonly ts: string | null | undefined;
}

/** {@link WorktreeRemovalAudit} after normalization: trimmed, capped, empty → null. */
export interface NormalizedWorktreeRemovalAudit {
  readonly agentSession: string | null;
  readonly ancestry: string | null;
  readonly branch: string | null;
  readonly parentCommand: string | null;
  readonly pid: number | null;
  readonly ppid: number | null;
  readonly probe: string | null;
  readonly removedAt: Date | null;
  readonly result: string | null;
}
