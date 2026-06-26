/**
 * @description Tests for getWorktreeTargetsFromEnv: parses WORKTREE_TARGETS as either an
 * array of { id, path } objects or [id, path] tuples, and degrades safely (empty array) on
 * missing/blank/non-JSON/garbage input. A bad env must never throw or yield malformed targets,
 * since the result seeds the WorktreeTargetsTracker allocation pool.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getWorktreeTargetsFromEnv } from './worktree-targets.env';

describe('getWorktreeTargetsFromEnv', () => {
  const originalValue = process.env.WORKTREE_TARGETS;

  beforeEach(() => {
    delete process.env.WORKTREE_TARGETS;
  });

  afterEach(() => {
    if (originalValue === undefined) {
      delete process.env.WORKTREE_TARGETS;
    } else {
      process.env.WORKTREE_TARGETS = originalValue;
    }
  });

  describe('empty / missing input', () => {
    it('returns [] when the var is unset', () => {
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });

    it('returns [] when the var is an empty string', () => {
      process.env.WORKTREE_TARGETS = '';
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });

    it('returns [] when the var is only whitespace', () => {
      process.env.WORKTREE_TARGETS = '   ';
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });
  });

  describe('object form', () => {
    it('parses an array of { id, path } objects', () => {
      process.env.WORKTREE_TARGETS = JSON.stringify([
        { id: 'wt1', path: '/path/to/wt1' },
        { id: 'wt2', path: '/path/to/wt2' },
      ]);

      expect(getWorktreeTargetsFromEnv()).toEqual([
        { id: 'wt1', path: '/path/to/wt1' },
        { id: 'wt2', path: '/path/to/wt2' },
      ]);
    });
  });

  describe('tuple form', () => {
    it('parses an array of [id, path] tuples', () => {
      process.env.WORKTREE_TARGETS = JSON.stringify([
        ['wt1', '/path/to/wt1'],
        ['wt2', '/path/to/wt2'],
      ]);

      expect(getWorktreeTargetsFromEnv()).toEqual([
        { id: 'wt1', path: '/path/to/wt1' },
        { id: 'wt2', path: '/path/to/wt2' },
      ]);
    });

    it('ignores extra tuple elements beyond [id, path]', () => {
      process.env.WORKTREE_TARGETS = JSON.stringify([
        ['wt1', '/path/to/wt1', 'extra', 'more'],
      ]);

      expect(getWorktreeTargetsFromEnv()).toEqual([
        { id: 'wt1', path: '/path/to/wt1' },
      ]);
    });
  });

  describe('garbage / malformed input', () => {
    it('returns [] for non-JSON', () => {
      process.env.WORKTREE_TARGETS = 'not json at all';
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });

    it('returns [] when JSON is not an array (object)', () => {
      process.env.WORKTREE_TARGETS = JSON.stringify({ id: 'wt1', path: '/x' });
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });

    it('returns [] when JSON is a primitive', () => {
      process.env.WORKTREE_TARGETS = '42';
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });

    it('drops malformed entries but keeps valid ones', () => {
      process.env.WORKTREE_TARGETS = JSON.stringify([
        { id: 'wt1', path: '/path/to/wt1' },
        { id: 'missing-path' },
        { path: '/missing-id' },
        ['only-one'],
        ['wt2', 42],
        42,
        null,
        ['wt3', '/path/to/wt3'],
      ]);

      expect(getWorktreeTargetsFromEnv()).toEqual([
        { id: 'wt1', path: '/path/to/wt1' },
        { id: 'wt3', path: '/path/to/wt3' },
      ]);
    });

    it('returns [] for an empty JSON array', () => {
      process.env.WORKTREE_TARGETS = '[]';
      expect(getWorktreeTargetsFromEnv()).toEqual([]);
    });
  });
});
