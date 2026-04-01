/**
 * In-memory implementation of worktree target tracking for BullMQ workflow.
 * Tracks how many targets exist and exposes lock/availability state.
 *
 * Concurrency: acquire() is not atomic under concurrent calls (TOCTOU between
 * getAvailableTarget() and mutating the target). Safe when only one job runs
 * at a time (e.g. BullMQ concurrency 1). For CONCURRENCY > 1 use a process-local
 * mutex around acquire/release or a Redis-backed IWorktreeTargetsTracker.
 * release() is correctly scoped by lockedBy (wrong owner or double-release fail).
 */

import type {
  AcquireResult,
  IWorktreeTargetsTracker,
  ReleaseResult,
  WorktreeTarget,
  WorktreeTargetAvailable,
  WorktreeTargetLocked,
} from '../types/worktree';

interface TargetState {
  readonly id: string;
  readonly path: string;
  status: 'available' | 'locked';
  lockedBy: string | undefined;
}

/**
 * @description In-memory tracker for worktree targets. Use for single-process or
 * same-host workflows; for multi-worker use a Redis-backed implementation.
 */
export class WorktreeTargetsTracker implements IWorktreeTargetsTracker {
  private readonly targets: Map<string, TargetState> = new Map();

  constructor(initialTargets: readonly { id: string; path: string }[] = []) {
    for (const { id, path } of initialTargets) {
      this.targets.set(id, {
        id,
        lockedBy: undefined,
        path,
        status: 'available',
      });
    }
  }

  /** Register an additional target (no-op if id already exists). */
  register(id: string, path: string): void {
    if (!this.targets.has(id)) {
      this.targets.set(id, {
        id,
        lockedBy: undefined,
        path,
        status: 'available',
      });
    }
  }

  listTargets(): readonly WorktreeTarget[] {
    return Array.from(this.targets.values(), (t): WorktreeTarget => {
      if (t.status === 'available') {
        return { id: t.id, path: t.path, status: 'available' };
      }
      return {
        id: t.id,
        lockedBy: t.lockedBy ?? '',
        path: t.path,
        status: 'locked',
      };
    });
  }

  hasAvailableTarget(): boolean {
    return this.getAvailableTarget() !== undefined;
  }

  getAvailableTarget(): WorktreeTargetAvailable | undefined {
    for (const t of this.targets.values()) {
      if (t.status === 'available') {
        return { id: t.id, path: t.path, status: 'available' };
      }
    }
    return undefined;
  }

  acquire(options: { id?: string; lockedBy: string }): AcquireResult {
    const { id, lockedBy } = options;

    if (this.targets.size === 0) {
      return { ok: false, reason: 'no_targets' };
    }

    if (id !== undefined) {
      const target = this.targets.get(id);
      if (target === undefined) {
        return { ok: false, reason: 'id_not_found' };
      }

      if (target.status !== 'available') {
        return { ok: false, reason: 'all_locked' };
      }

      target.status = 'locked';
      target.lockedBy = lockedBy;

      const snapshot: WorktreeTargetLocked = {
        id: target.id,
        lockedBy,
        path: target.path,
        status: 'locked',
      };

      return { ok: true, target: snapshot };
    }

    const available = this.getAvailableTarget();
    if (available === undefined) {
      return { ok: false, reason: 'all_locked' };
    }
    const target = this.targets.get(available.id);
    if (target === undefined) {
      return { ok: false, reason: 'all_locked' };
    }
    target.status = 'locked';
    target.lockedBy = lockedBy;
    const snapshot: WorktreeTargetLocked = {
      id: target.id,
      lockedBy,
      path: target.path,
      status: 'locked',
    };
    return { ok: true, target: snapshot };
  }

  release(options: { id: string; lockedBy: string }): ReleaseResult {
    const { id, lockedBy } = options;
    const target = this.targets.get(id);
    if (target === undefined) {
      return { ok: false, reason: 'id_not_found' };
    }
    if (target.status !== 'locked') {
      return { ok: false, reason: 'not_locked' };
    }
    if (target.lockedBy !== lockedBy) {
      return { ok: false, reason: 'locked_by_other' };
    }
    target.status = 'available';
    target.lockedBy = undefined;
    return { ok: true };
  }
}
