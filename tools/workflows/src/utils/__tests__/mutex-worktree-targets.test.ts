/**
 * @description Tests for mutex-wrapped worktree target tracker.
 */

import { Mutex } from 'async-mutex';
import { describe, expect, it, vi } from 'vitest';
import type { AcquireResult } from '../../types/worktree';
import {
  createMutexWorktreeTargetsTracker,
  MutexWorktreeTargetsTracker,
} from '../mutex-worktree-targets';
import { WorktreeTargetsTracker } from '../worktree-targets';

describe('MutexWorktreeTargetsTracker', () => {
  describe('delegated read methods', () => {
    it('listTargets delegates to underlying tracker', () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
        { id: 'wt2', path: '/path/two' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const targets = mutexTracker.listTargets();
      expect(targets).toHaveLength(2);
      expect(targets[0]?.id).toBe('wt1');
      expect(targets[1]?.id).toBe('wt2');
    });

    it('hasAvailableTarget delegates to underlying tracker', () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      expect(mutexTracker.hasAvailableTarget()).toBe(true);
    });

    it('getAvailableTarget delegates to underlying tracker', () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const available = mutexTracker.getAvailableTarget();
      expect(available?.id).toBe('wt1');
    });

    it('targetCount returns the number of registered targets', () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
        { id: 'wt2', path: '/path/two' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      expect(mutexTracker.targetCount).toBe(2);
    });
  });

  describe('acquire with mutex', () => {
    it('acquire returns locked target on success', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const result = await mutexTracker.acquire({ lockedBy: 'job-1' });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.target.id).toBe('wt1');
        expect(result.target.lockedBy).toBe('job-1');
        expect(result.target.status).toBe('locked');
      }
    });

    it('acquire by id returns locked target when available', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
        { id: 'wt2', path: '/path/two' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const result = await mutexTracker.acquire({
        id: 'wt2',
        lockedBy: 'job-1',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.target.id).toBe('wt2');
      }
    });

    it('acquire returns all_locked when no targets available', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      await mutexTracker.acquire({ lockedBy: 'job-1' });
      const result = await mutexTracker.acquire({ lockedBy: 'job-2' });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('all_locked');
      }
    });

    it('acquire returns no_targets when tracker is empty', async () => {
      const baseTracker = new WorktreeTargetsTracker([]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const result = await mutexTracker.acquire({ lockedBy: 'job-1' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('no_targets');
      }
    });
  });

  describe('release with mutex', () => {
    it('release unlocks target when locked by same owner', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      await mutexTracker.acquire({ lockedBy: 'job-1' });
      expect(mutexTracker.hasAvailableTarget()).toBe(false);

      const result = await mutexTracker.release({
        id: 'wt1',
        lockedBy: 'job-1',
      });
      expect(result.ok).toBe(true);
      expect(mutexTracker.hasAvailableTarget()).toBe(true);
    });

    it('release returns not_locked when target is available', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const result = await mutexTracker.release({
        id: 'wt1',
        lockedBy: 'job-1',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('not_locked');
      }
    });

    it('release returns locked_by_other when owner does not match', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      await mutexTracker.acquire({ lockedBy: 'job-1' });
      const result = await mutexTracker.release({
        id: 'wt1',
        lockedBy: 'job-2',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('locked_by_other');
      }
    });
  });

  describe('concurrent acquire serialization', () => {
    it('serializes concurrent acquire calls to prevent TOCTOU race', async () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
        { id: 'wt2', path: '/path/two' },
      ]);
      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const [result1, result2, result3] = await Promise.all([
        mutexTracker.acquire({ lockedBy: 'job-1' }),
        mutexTracker.acquire({ lockedBy: 'job-2' }),
        mutexTracker.acquire({ lockedBy: 'job-3' }),
      ]);

      const successes = [result1, result2, result3].filter((r) => r.ok);
      const failures = [result1, result2, result3].filter((r) => !r.ok);

      expect(successes).toHaveLength(2);
      expect(failures).toHaveLength(1);

      if (!failures[0]?.ok) {
        expect(failures[0].reason).toBe('all_locked');
      }

      const lockedTargetIds = successes
        .filter((r): r is AcquireResult & { ok: true } => r.ok)
        .map((r) => r.target.id);

      expect(new Set(lockedTargetIds).size).toBe(2);
    });

    it('mutex ensures only one acquire executes at a time', async () => {
      const executionOrder: string[] = [];

      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);

      const originalAcquire = baseTracker.acquire.bind(baseTracker);
      baseTracker.acquire = vi.fn((options) => {
        executionOrder.push(`acquire-${options.lockedBy}`);
        return originalAcquire(options);
      });

      const mutexTracker = new MutexWorktreeTargetsTracker(
        baseTracker,
        new Mutex(),
      );

      const [result1, result2] = await Promise.all([
        mutexTracker.acquire({ lockedBy: 'job-1' }),
        mutexTracker.acquire({ lockedBy: 'job-2' }),
      ]);

      expect(executionOrder).toHaveLength(2);

      const successes = [result1, result2].filter((r) => r.ok);
      const failures = [result1, result2].filter((r) => !r.ok);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
    });
  });

  describe('factory function', () => {
    it('createMutexWorktreeTargetsTracker creates a wrapper with new Mutex', () => {
      const baseTracker = new WorktreeTargetsTracker([
        { id: 'wt1', path: '/path/one' },
      ]);

      const mutexTracker = createMutexWorktreeTargetsTracker(
        baseTracker,
        Mutex,
      );

      expect(mutexTracker).toBeInstanceOf(MutexWorktreeTargetsTracker);
      expect(mutexTracker.targetCount).toBe(1);
    });
  });
});
