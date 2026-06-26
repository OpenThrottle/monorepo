/**
 * Mutex-wrapped implementation of worktree target tracking for safe concurrent BullMQ jobs.
 * Wraps an IWorktreeTargetsTracker with a mutex to prevent TOCTOU race conditions
 * when CONCURRENCY > 1 in the BullMQ worker.
 *
 * The underlying tracker (e.g. WorktreeTargetsTracker) has a non-atomic acquire():
 * getAvailableTarget() + mutate is not safe under concurrent calls. This wrapper
 * serializes acquire/release through a mutex, enabling safe parallel job processing.
 */

import type { Mutex } from 'async-mutex';
import type {
  AcquireResult,
  IWorktreeTargetsTracker,
  ReleaseResult,
  WorktreeTarget,
  WorktreeTargetAvailable,
} from '../types/worktree';

/**
 * @description Async mutex-wrapped interface for worktree target tracking.
 * acquire and release return Promises (they hold the mutex while operating).
 */
export interface IMutexWorktreeTargetsTracker {
  /**
   * Lock a target atomically: acquires mutex, then calls underlying tracker.acquire().
   * Safe for concurrent calls (serialized through mutex).
   */
  acquire(options: { id?: string; lockedBy: string }): Promise<AcquireResult>;

  /**
   * First available target, or undefined if none (no mutex needed for read).
   *
   * Read-only and outside the mutex, so the result is eventual-consistency: a
   * target reported available here may be locked by a concurrent job before you
   * act on it. Treat the value as a hint only — do NOT gate an acquire on it.
   * To actually claim a target, call `acquire()` and branch on its result
   * (`reason: 'all_locked'` means none were free under lock); that re-checks
   * availability inside the critical section and is the only race-free path.
   */
  getAvailableTarget(): WorktreeTargetAvailable | undefined;

  /**
   * Whether at least one target is available (no mutex needed for read).
   *
   * Read-only and outside the mutex, so this is an eventual-consistency hint:
   * a `true` here can become stale before a subsequent `acquire()`. Do NOT use
   * a `hasAvailableTarget()` then `acquire()` pattern as a gate — that
   * reintroduces the TOCTOU race the mutex exists to close. Just call
   * `acquire()` and rely on its result (`all_locked` when none are free).
   */
  hasAvailableTarget(): boolean;

  /** All registered targets and their current status (no mutex needed for read). */
  listTargets(): readonly WorktreeTarget[];

  /**
   * Unlock a target atomically: acquires mutex, then calls underlying tracker.release().
   * Safe for concurrent calls (serialized through mutex).
   */
  release(options: { id: string; lockedBy: string }): Promise<ReleaseResult>;

  /** Number of registered worktree targets. */
  readonly targetCount: number;
}

/**
 * @description Wraps an IWorktreeTargetsTracker with a mutex to enable safe concurrent
 * acquire/release for BullMQ workers with CONCURRENCY > 1. Read-only methods (listTargets,
 * hasAvailableTarget, getAvailableTarget) do not acquire the mutex (eventual consistency
 * is acceptable for checks; acquire/release are the critical sections).
 *
 * Usage note (TOCTOU): the read methods are hints only. Callers MUST NOT gate an
 * acquire on a prior `hasAvailableTarget()`/`getAvailableTarget()` — a target seen as
 * available can be locked by a concurrent job in the gap before `acquire()`, which
 * reopens the very race this mutex closes. Call `acquire()` and branch on its result
 * (`reason: 'all_locked'` = none were free under lock); only that re-checks under the
 * mutex. The reads exist for observability/metrics/logging, not allocation control.
 */
export class MutexWorktreeTargetsTracker implements IMutexWorktreeTargetsTracker {
  constructor(
    private readonly tracker: IWorktreeTargetsTracker,
    private readonly mutex: Mutex,
  ) {}

  get targetCount(): number {
    return this.tracker.listTargets().length;
  }

  listTargets(): readonly WorktreeTarget[] {
    return this.tracker.listTargets();
  }

  hasAvailableTarget(): boolean {
    return this.tracker.hasAvailableTarget();
  }

  getAvailableTarget(): WorktreeTargetAvailable | undefined {
    return this.tracker.getAvailableTarget();
  }

  async acquire(options: {
    id?: string;
    lockedBy: string;
  }): Promise<AcquireResult> {
    return this.mutex.runExclusive(() => this.tracker.acquire(options));
  }

  async release(options: {
    id: string;
    lockedBy: string;
  }): Promise<ReleaseResult> {
    return this.mutex.runExclusive(() => this.tracker.release(options));
  }
}

/**
 * @description Factory function to create a MutexWorktreeTargetsTracker.
 * Creates a new Mutex instance for the wrapper.
 */
export function createMutexWorktreeTargetsTracker(
  tracker: IWorktreeTargetsTracker,
  MutexClass: new () => Mutex,
): MutexWorktreeTargetsTracker {
  return new MutexWorktreeTargetsTracker(tracker, new MutexClass());
}
