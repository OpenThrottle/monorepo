/**
 * @description Per-checkout outcomes of a worktree checkout prune. Every requested id gets exactly
 * one, so a partial prune is reported rather than thrown.
 */

/**
 * - `PRUNED` — the row was deleted.
 * - `SKIPPED_LIVE` — the path is a live linked worktree right now; the row is not stale.
 * - `SKIPPED_ACTIVE_RUN` — an unsettled (QUEUED / IN_PROGRESS) plan run still points at the row.
 * - `SKIPPED_PRIMARY` — the row is a primary checkout, which prune never touches.
 * - `NOT_FOUND` — no checkout with that id is owned by the caller (or it was deleted concurrently).
 */
export const PRUNE_WORKTREE_CHECKOUT_OUTCOME = {
  NOT_FOUND: 'not-found',
  PRUNED: 'pruned',
  SKIPPED_ACTIVE_RUN: 'skipped-active-run',
  SKIPPED_LIVE: 'skipped-live',
  SKIPPED_PRIMARY: 'skipped-primary',
} as const;

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
