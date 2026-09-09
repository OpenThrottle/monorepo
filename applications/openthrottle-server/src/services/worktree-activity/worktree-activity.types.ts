/**
 * @description Activity classification for a discovered worktree. "In progress" is DEFINED here and
 * never inferred from a directory existing on disk.
 */

import type {
  DiscoveredWorktree,
  ScannedWorktreeRoot,
  WorktreeDiscoveryProblem,
} from '../worktree-discovery/worktree-discovery.types';
import type { WorktreeRootSource } from '../worktree-root/worktree-root.resolver';

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

export type WorktreeActivity =
  (typeof WORKTREE_ACTIVITY)[keyof typeof WORKTREE_ACTIVITY];

export interface ClassifiedWorktree extends DiscoveredWorktree {
  readonly activity: WorktreeActivity;
  /**
   * The plan the live run belongs to, when {@link activity} is RUNNING; else null. The UI links to
   * the PLAN — there is no plan-run detail route — so a bare run id would be unlinkable.
   */
  readonly planId: string | null;
  /** The live run's id when {@link activity} is RUNNING; else null. */
  readonly planRunId: string | null;
  /**
   * Whether the live run's liveness is actually VERIFIED, or merely claimed. True when the run
   * heartbeats on a timer, so RUNNING is a checked fact. False when it does not (an interactive
   * /ot-loop turn, `heartbeat_expected = false`): the row says IN_PROGRESS and nothing confirms it,
   * so the worktree may be held busy by an agent that died hours ago. Null when nothing is running.
   *
   * A distinct field rather than a fourth {@link WorktreeActivity} value on purpose: the worktree
   * genuinely IS claimed either way, and folding "unverified" into the activity enum would force
   * every reader to handle a new state just to learn how much to trust the old one.
   */
  readonly runMonitored: boolean | null;
  /**
   * No `repository_checkouts` row at this path for this user. Orthogonal to {@link activity} — an
   * unregistered worktree can perfectly well be DIRTY.
   */
  readonly unregistered: boolean;
}

export interface WorktreeActivityResult {
  readonly droppedCount: number;
  /** Classified non-fatal problems from discovery, plus anything classification itself hit. */
  readonly problems: readonly WorktreeDiscoveryProblem[];
  readonly rootSource: WorktreeRootSource | null;
  readonly scannedAt: string;
  /** Every root the scan looked in; {@link worktreeRoot} is only the first of these. */
  readonly scannedRoots: readonly ScannedWorktreeRoot[];
  /** @deprecated Use {@link problems}. */
  readonly warnings: readonly string[];
  readonly worktreeRoot: string | null;
  readonly worktrees: readonly ClassifiedWorktree[];
}
