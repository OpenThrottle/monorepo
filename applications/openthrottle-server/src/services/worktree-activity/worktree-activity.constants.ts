/**
 * One activity state per worktree, in precedence order:
 * - `RUNNING` — a LIVE `IN_PROGRESS` plan run is executing here. Live means its heartbeat is inside
 *   the staleness cutoff; a stale IN_PROGRESS row is dead, not running.
 * - `DIRTY` — no live run, but there is uncommitted work or commits ahead of the upstream.
 * - `IDLE` — clean, and nothing running.
 */
export const WORKTREE_ACTIVITY = {
  DIRTY: 'DIRTY',
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
} as const;
