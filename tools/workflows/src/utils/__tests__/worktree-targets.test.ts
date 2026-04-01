/**
 * @description Tests for in-memory worktree target tracker.
 */

import { describe, expect, it } from 'vitest';
import { WorktreeTargetsTracker } from '../worktree-targets';

describe('WorktreeTargetsTracker', () => {
  it('starts with no targets when given no initial targets', () => {
    const tracker = new WorktreeTargetsTracker();
    expect(tracker.listTargets()).toHaveLength(0);
    expect(tracker.hasAvailableTarget()).toBe(false);
    expect(tracker.getAvailableTarget()).toBeUndefined();
  });

  it('lists initial targets as available', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
      { id: 'wt2', path: '/path/two' },
    ]);
    const list = tracker.listTargets();
    expect(list).toHaveLength(2);
    expect(list.every((t) => t.status === 'available')).toBe(true);
    expect(tracker.hasAvailableTarget()).toBe(true);
    const first = tracker.getAvailableTarget();
    expect(first).toBeDefined();
    expect(first?.status).toBe('available');
    expect(['wt1', 'wt2']).toContain(first?.id);
  });

  it('register adds a new target and does not overwrite existing id', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
    ]);
    tracker.register('wt2', '/path/two');
    expect(tracker.listTargets()).toHaveLength(2);
    tracker.register('wt1', '/other/path');
    const list = tracker.listTargets();
    const wt1 = list.find((t) => t.id === 'wt1');
    expect(wt1?.path).toBe('/path/one');
  });

  it('acquire with no id locks first available target', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
      { id: 'wt2', path: '/path/two' },
    ]);
    const result = tracker.acquire({ lockedBy: 'job-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.target.status).toBe('locked');
      expect(result.target.lockedBy).toBe('job-1');
    }
    expect(tracker.hasAvailableTarget()).toBe(true);
    const second = tracker.acquire({ lockedBy: 'job-2' });
    expect(second.ok).toBe(true);
    expect(tracker.hasAvailableTarget()).toBe(false);
    expect(tracker.getAvailableTarget()).toBeUndefined();
    const third = tracker.acquire({ lockedBy: 'job-3' });
    expect(third.ok).toBe(false);
    expect(third.ok === false && third.reason).toBe('all_locked');
  });

  it('acquire by id locks that target when available', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
      { id: 'wt2', path: '/path/two' },
    ]);
    const result = tracker.acquire({ id: 'wt2', lockedBy: 'job-1' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.target.id).toBe('wt2');
      expect(result.target.path).toBe('/path/two');
    }
    const available = tracker.getAvailableTarget();
    expect(available?.id).toBe('wt1');
  });

  it('acquire by id returns id_not_found for unknown id', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
    ]);
    const result = tracker.acquire({ id: 'wt-missing', lockedBy: 'job-1' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('id_not_found');
  });

  it('acquire returns no_targets when tracker is empty', () => {
    const tracker = new WorktreeTargetsTracker();
    const result = tracker.acquire({ lockedBy: 'job-1' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('no_targets');
  });

  it('release unlocks target when locked by same owner', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
    ]);
    tracker.acquire({ id: 'wt1', lockedBy: 'job-1' });
    expect(tracker.hasAvailableTarget()).toBe(false);
    const releaseResult = tracker.release({ id: 'wt1', lockedBy: 'job-1' });
    expect(releaseResult.ok).toBe(true);
    expect(tracker.hasAvailableTarget()).toBe(true);
    expect(tracker.getAvailableTarget()?.id).toBe('wt1');
  });

  it('release returns not_locked when target is available', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
    ]);
    const result = tracker.release({ id: 'wt1', lockedBy: 'job-1' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('not_locked');
  });

  it('release returns locked_by_other when owner does not match', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
    ]);
    tracker.acquire({ id: 'wt1', lockedBy: 'job-1' });
    const result = tracker.release({ id: 'wt1', lockedBy: 'job-2' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('locked_by_other');
  });

  it('release returns id_not_found for unknown id', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
    ]);
    const result = tracker.release({ id: 'wt-missing', lockedBy: 'job-1' });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('id_not_found');
  });

  it('listTargets returns correct snapshots for mixed available and locked', () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/path/one' },
      { id: 'wt2', path: '/path/two' },
    ]);
    tracker.acquire({ id: 'wt1', lockedBy: 'job-1' });
    const list = tracker.listTargets();
    const lockedOne = list.find((t) => t.id === 'wt1');
    const availableTwo = list.find((t) => t.id === 'wt2');
    expect(lockedOne?.status).toBe('locked');
    expect(lockedOne?.status === 'locked' && lockedOne.lockedBy).toBe('job-1');
    expect(availableTwo?.status).toBe('available');
  });
});
