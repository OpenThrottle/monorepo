/**
 * @description THE server-wide "does this checkout own repeatables" check. Every boot-time
 * registration of a recurring BullMQ job (the `*-repeatable.service.ts` classes and the
 * scheduled-agent-jobs boot reconcile) asks this one resolver before it touches a queue.
 *
 * Why it exists: queue keys are already isolated per checkout (`resolveQueuePrefix()` gives every
 * worktree its own `bull:wt-<slug>` prefix), so a worktree never consumes the primary's jobs. The
 * hazard is DUPLICATE EXECUTION against a shared database: with `PROCESS_ROLE=all` a shared-DB
 * worktree registers its own copy of every repeatable under its own prefix and runs it against the
 * user's real data (and, for doc ingestion, double-spends embeddings).
 *
 * Precedence:
 *
 * 1. `OT_SCHEDULED_JOBS_OWNER` — explicit override, wins in both directions. (The name predates the
 *    generalisation from scheduled agent jobs to every repeatable; it is kept so existing env keeps
 *    working.)
 * 2. `OT_WORKTREE_DB=shared` — a worktree on the primary's Postgres/Redis: NOT the owner.
 * 3. `OT_WORKTREE_DB=isolated` — a worktree with its own Postgres and Redis: the owner, it behaves
 *    like a primary.
 * 4. Marker absent (or unrecognised) — the primary checkout: the owner.
 *
 * Only registration is gated. On-mutation scheduled-job upserts/removals always apply, so a user
 * editing a schedule takes effect immediately regardless of which checkout served the request.
 */

/** @description Whether this checkout registers repeatables, and the one-line reason to log. */
export interface RepeatablesOwnership {
  readonly owner: boolean;
  readonly reason: string;
}

export const resolveRepeatablesOwner = (): RepeatablesOwnership => {
  const explicit = process.env.OT_SCHEDULED_JOBS_OWNER?.trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') {
    return { owner: true, reason: 'OT_SCHEDULED_JOBS_OWNER is set true' };
  }
  if (explicit === 'false' || explicit === '0') {
    return { owner: false, reason: 'OT_SCHEDULED_JOBS_OWNER is set false' };
  }

  const worktreeDb = process.env.OT_WORKTREE_DB?.trim().toLowerCase();
  if (worktreeDb === 'shared') {
    return {
      owner: false,
      reason:
        'OT_WORKTREE_DB=shared: this worktree shares the primary database, so only the primary registers repeatables (set OT_SCHEDULED_JOBS_OWNER=true to override)',
    };
  }
  if (worktreeDb === 'isolated') {
    return {
      owner: true,
      reason: 'OT_WORKTREE_DB=isolated: this worktree owns its own database',
    };
  }

  return { owner: true, reason: 'canonical checkout' };
};
