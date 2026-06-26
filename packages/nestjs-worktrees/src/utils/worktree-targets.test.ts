/**
 * @description Unit tests for the in-memory WorktreeTargetsTracker: acquire (happy path,
 * by id, and every failure reason), release owner-scoping (wrong owner, double release,
 * not-found, not-locked), and registration/listing semantics. These guard allocation
 * correctness and the lock/release owner scoping that prevents one job from releasing
 * another job's target.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { WorktreeTargetsTracker } from './worktree-targets';

const initialTargets = [
  { id: 'wt1', path: '/tmp/wt1' },
  { id: 'wt2', path: '/tmp/wt2' },
] as const;

describe('WorktreeTargetsTracker', () => {
  let tracker: WorktreeTargetsTracker;

  beforeEach(() => {
    tracker = new WorktreeTargetsTracker(initialTargets);
  });

  describe('construction and listing', () => {
    it('registers initial targets as available', () => {
      expect(tracker.listTargets()).toEqual([
        { id: 'wt1', path: '/tmp/wt1', status: 'available' },
        { id: 'wt2', path: '/tmp/wt2', status: 'available' },
      ]);
      expect(tracker.hasAvailableTarget()).toBe(true);
    });

    it('defaults to no targets when none provided', () => {
      const empty = new WorktreeTargetsTracker();
      expect(empty.listTargets()).toEqual([]);
      expect(empty.hasAvailableTarget()).toBe(false);
      expect(empty.getAvailableTarget()).toBeUndefined();
    });

    it('register adds a new target and is a no-op for a duplicate id', () => {
      tracker.register('wt3', '/tmp/wt3');
      expect(tracker.listTargets()).toHaveLength(3);

      // Duplicate id must not overwrite the existing target's path.
      tracker.register('wt1', '/tmp/OVERWRITTEN');
      const wt1 = tracker.listTargets().find((t) => t.id === 'wt1');
      expect(wt1?.path).toBe('/tmp/wt1');
    });
  });

  describe('acquire — happy paths', () => {
    it('acquires the first available target when no id is given', () => {
      const result = tracker.acquire({ lockedBy: 'job-a' });

      expect(result).toEqual({
        ok: true,
        target: {
          id: 'wt1',
          lockedBy: 'job-a',
          path: '/tmp/wt1',
          status: 'locked',
        },
      });
      expect(tracker.getAvailableTarget()?.id).toBe('wt2');
    });

    it('acquires a specific target by id', () => {
      const result = tracker.acquire({ id: 'wt2', lockedBy: 'job-b' });

      expect(result).toEqual({
        ok: true,
        target: {
          id: 'wt2',
          lockedBy: 'job-b',
          path: '/tmp/wt2',
          status: 'locked',
        },
      });
    });

    it('reflects a locked target in listTargets with its owner', () => {
      tracker.acquire({ id: 'wt1', lockedBy: 'job-a' });

      expect(tracker.listTargets()).toContainEqual({
        id: 'wt1',
        lockedBy: 'job-a',
        path: '/tmp/wt1',
        status: 'locked',
      });
    });
  });

  describe('acquire — failure reasons', () => {
    it('returns no_targets when the tracker is empty', () => {
      const empty = new WorktreeTargetsTracker();
      expect(empty.acquire({ lockedBy: 'job-a' })).toEqual({
        ok: false,
        reason: 'no_targets',
      });
    });

    it('returns id_not_found when acquiring an unknown id', () => {
      expect(tracker.acquire({ id: 'nope', lockedBy: 'job-a' })).toEqual({
        ok: false,
        reason: 'id_not_found',
      });
    });

    it('returns all_locked when the requested id is already locked', () => {
      tracker.acquire({ id: 'wt1', lockedBy: 'job-a' });

      expect(tracker.acquire({ id: 'wt1', lockedBy: 'job-b' })).toEqual({
        ok: false,
        reason: 'all_locked',
      });
    });

    it('returns all_locked when every target is locked and no id is given', () => {
      tracker.acquire({ lockedBy: 'job-a' });
      tracker.acquire({ lockedBy: 'job-b' });

      expect(tracker.acquire({ lockedBy: 'job-c' })).toEqual({
        ok: false,
        reason: 'all_locked',
      });
      expect(tracker.hasAvailableTarget()).toBe(false);
    });
  });

  describe('release — owner scoping', () => {
    it('releases a target locked by the same owner', () => {
      tracker.acquire({ id: 'wt1', lockedBy: 'job-a' });

      expect(tracker.release({ id: 'wt1', lockedBy: 'job-a' })).toEqual({
        ok: true,
      });
      expect(tracker.getAvailableTarget()?.id).toBe('wt1');
    });

    it('refuses to release a target locked by a different owner', () => {
      tracker.acquire({ id: 'wt1', lockedBy: 'job-a' });

      expect(tracker.release({ id: 'wt1', lockedBy: 'job-b' })).toEqual({
        ok: false,
        reason: 'locked_by_other',
      });
      // The target stays locked by the original owner.
      expect(tracker.listTargets()).toContainEqual({
        id: 'wt1',
        lockedBy: 'job-a',
        path: '/tmp/wt1',
        status: 'locked',
      });
    });

    it('fails a double-release (second release sees an available target)', () => {
      tracker.acquire({ id: 'wt1', lockedBy: 'job-a' });
      expect(tracker.release({ id: 'wt1', lockedBy: 'job-a' }).ok).toBe(true);

      expect(tracker.release({ id: 'wt1', lockedBy: 'job-a' })).toEqual({
        ok: false,
        reason: 'not_locked',
      });
    });

    it('returns not_locked when releasing a never-locked target', () => {
      expect(tracker.release({ id: 'wt1', lockedBy: 'job-a' })).toEqual({
        ok: false,
        reason: 'not_locked',
      });
    });

    it('returns id_not_found when releasing an unknown id', () => {
      expect(tracker.release({ id: 'nope', lockedBy: 'job-a' })).toEqual({
        ok: false,
        reason: 'id_not_found',
      });
    });

    it('allows re-acquisition after release', () => {
      tracker.acquire({ id: 'wt1', lockedBy: 'job-a' });
      tracker.release({ id: 'wt1', lockedBy: 'job-a' });

      const reacquired = tracker.acquire({ id: 'wt1', lockedBy: 'job-b' });
      expect(reacquired.ok).toBe(true);
    });
  });
});
