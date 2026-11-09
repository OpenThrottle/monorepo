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

/**
 * How long one user's on-disk discovery (the git/fs half of {@link WORKTREE_ACTIVITY}
 * classification) is reused before the next read rescans. Discovery shells out several times per
 * worktree and was the whole of /settings/repositories' load time (~1.4s for 12 worktrees), while
 * the page re-runs its loader on every search, sort and page change.
 *
 * Kept short because nothing invalidates it when a worktree appears or disappears outside
 * OpenThrottle. Changes made THROUGH OpenThrottle invalidate it explicitly, and the live-run half of
 * classification is never cached, so RUNNING is always current.
 */
export const DISCOVERY_CACHE_TTL_MS = 30_000;
