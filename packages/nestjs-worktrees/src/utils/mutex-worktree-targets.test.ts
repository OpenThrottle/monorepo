/**
 * @description Tests for MutexWorktreeTargetsTracker: delegation of read-only methods, async
 * acquire/release through the underlying tracker, and the core concurrency guarantee — parallel
 * acquires must be serialized so two jobs never receive the same target. This exercises the real
 * async-mutex Mutex to prove the wrapper closes the TOCTOU window in WorktreeTargetsTracker.acquire().
 */

import { Mutex } from 'async-mutex';
import { beforeEach, describe, expect, it } from 'vitest';
import type { AcquireResult } from '../types/worktree';
import type { MutexWorktreeTargetsTracker } from './mutex-worktree-targets';
import { createMutexWorktreeTargetsTracker } from './mutex-worktree-targets';
import { WorktreeTargetsTracker } from './worktree-targets';

const buildTracker = (count: number): WorktreeTargetsTracker =>
  new WorktreeTargetsTracker(
    Array.from({ length: count }, (_unused, i) => ({
      id: `wt${i + 1}`,
      path: `/tmp/wt${i + 1}`,
    })),
  );

describe('MutexWorktreeTargetsTracker', () => {
  let mutexTracker: MutexWorktreeTargetsTracker;

  beforeEach(() => {
    mutexTracker = createMutexWorktreeTargetsTracker(buildTracker(3), Mutex);
  });

  describe('read-only delegation', () => {
    it('reports targetCount from the underlying tracker', () => {
      expect(mutexTracker.targetCount).toBe(3);
    });

    it('delegates listTargets / hasAvailableTarget / getAvailableTarget', () => {
      expect(mutexTracker.listTargets()).toHaveLength(3);
      expect(mutexTracker.hasAvailableTarget()).toBe(true);
      expect(mutexTracker.getAvailableTarget()?.id).toBe('wt1');
    });
  });

  describe('acquire / release', () => {
    it('acquires and releases through the mutex', async () => {
      const acquired = await mutexTracker.acquire({ lockedBy: 'job-a' });
      expect(acquired.ok).toBe(true);
      if (!acquired.ok) return;

      const released = await mutexTracker.release({
        id: acquired.target.id,
        lockedBy: 'job-a',
      });
      expect(released).toEqual({ ok: true });
    });

    it('refuses a release from a different owner', async () => {
      const acquired = await mutexTracker.acquire({ lockedBy: 'job-a' });
      expect(acquired.ok).toBe(true);
      if (!acquired.ok) return;

      const released = await mutexTracker.release({
        id: acquired.target.id,
        lockedBy: 'job-b',
      });
      expect(released).toEqual({ ok: false, reason: 'locked_by_other' });
    });
  });

  describe('concurrency — serialized acquires', () => {
    it('gives distinct targets to parallel acquires (no double-allocation)', async () => {
      const tracker = createMutexWorktreeTargetsTracker(buildTracker(5), Mutex);

      const results = await Promise.all(
        Array.from({ length: 5 }, (_unused, i) =>
          tracker.acquire({ lockedBy: `job-${i}` }),
        ),
      );

      const acquiredIds = results
        .filter((r): r is Extract<AcquireResult, { ok: true }> => r.ok)
        .map((r) => r.target.id);

      expect(acquiredIds).toHaveLength(5);
      // Every acquired target id is unique — no two jobs got the same one.
      expect(new Set(acquiredIds).size).toBe(5);
    });

    it('fails the surplus acquires with all_locked when demand exceeds supply', async () => {
      const tracker = createMutexWorktreeTargetsTracker(buildTracker(2), Mutex);

      const results = await Promise.all(
        Array.from({ length: 4 }, (_unused, i) =>
          tracker.acquire({ lockedBy: `job-${i}` }),
        ),
      );

      const succeeded = results.filter((r) => r.ok);
      const failed = results.filter((r) => !r.ok);

      expect(succeeded).toHaveLength(2);
      expect(failed).toHaveLength(2);
      for (const f of failed) {
        expect(f).toEqual({ ok: false, reason: 'all_locked' });
      }
    });
  });
});
