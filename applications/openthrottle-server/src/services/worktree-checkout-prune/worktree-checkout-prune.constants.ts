/** Matches the discovery cap: a page never shows more rows than this to prune at once. */
export const MAX_PRUNE_CHECKOUT_IDS = 200;
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
