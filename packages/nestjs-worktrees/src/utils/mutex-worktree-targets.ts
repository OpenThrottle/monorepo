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
  /** All registered targets and their current status (no mutex needed for read). */
  listTargets(): readonly WorktreeTarget[];

  /** Whether at least one target is available (no mutex needed for read). */
  hasAvailableTarget(): boolean;

  /** First available target, or undefined if none (no mutex needed for read). */
  getAvailableTarget(): WorktreeTargetAvailable | undefined;

  /**
   * Lock a target atomically: acquires mutex, then calls underlying tracker.acquire().
   * Safe for concurrent calls (serialized through mutex).
   */
  acquire(options: { id?: string; lockedBy: string }): Promise<AcquireResult>;

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
