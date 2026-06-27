/**
 * Tests for reusable worktree workflow: acquire, run loop, ensure commit, release.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runWorktreeWorkflow } from '../workflow';
import { WorktreeTargetsTracker } from '../worktree-targets';

function createTempGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'workflow-git-'));
  spawnSync('git', ['init', '-b', 'main'], { cwd: dir, encoding: 'utf-8' });
  // CI runners have no global git identity; -c keeps the commit self-contained.
  spawnSync(
    'git',
    [
      '-c',
      'user.name=test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--allow-empty',
      '-m',
      'init',
    ],
    {
      cwd: dir,
      encoding: 'utf-8',
    },
  );
  return dir;
}

describe('runWorktreeWorkflow', () => {
  it('returns acquire fail and released false when tracker has no targets', async () => {
    const tracker = new WorktreeTargetsTracker();
    const result = await runWorktreeWorkflow({
      acquire: { lockedBy: 'job-1' },
      runLoop: async () => ({ ok: true }),
      tracker,
    });
    expect(result.acquire.ok).toBe(false);
    expect(result.released).toBe(false);
    expect(result.loop).toBeUndefined();
    expect(result.ensureCommit).toBeUndefined();
  });

  it('acquires, runs loop, ensures commit (no checks), and releases', async () => {
    const dir = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      const result = await runWorktreeWorkflow({
        acquire: {
          baseBranch: 'main',
          branchName: 'ralph/workflow-test',
          lockedBy: 'job-1',
        },
        ensureCommit: { runChecks: false },
        runLoop: async (handoff) => {
          expect(handoff.worktreePath).toBe(dir);
          expect(handoff.targetId).toBe('wt1');
          expect(handoff.branchName).toBe('ralph/workflow-test');
          return { ok: true };
        },
        tracker,
      });
      expect(result.acquire.ok).toBe(true);
      expect(result.loop?.ok).toBe(true);
      expect(result.ensureCommit?.ok).toBe(true);
      expect(result.released).toBe(true);
      expect(tracker.hasAvailableTarget()).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('releases target when loop returns ok: false', async () => {
    const dir = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      const result = await runWorktreeWorkflow({
        acquire: {
          baseBranch: 'main',
          branchName: 'ralph/fail-loop',
          lockedBy: 'job-1',
        },
        ensureCommit: { runChecks: false },
        runLoop: async () => ({ ok: false, reason: 'simulated failure' }),
        tracker,
      });
      expect(result.acquire.ok).toBe(true);
      expect(result.loop?.ok).toBe(false);
      if (result.loop && !result.loop.ok) {
        expect(result.loop.reason).toBe('simulated failure');
      }
      expect(result.ensureCommit).toBeUndefined();
      expect(result.released).toBe(true);
      expect(tracker.hasAvailableTarget()).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('releases target when loop throws', async () => {
    const dir = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      const result = await runWorktreeWorkflow({
        acquire: {
          baseBranch: 'main',
          branchName: 'ralph/throw-loop',
          lockedBy: 'job-1',
        },
        ensureCommit: { runChecks: false },
        runLoop: async () => {
          throw new Error('loop threw');
        },
        tracker,
      });
      expect(result.acquire.ok).toBe(true);
      expect(result.loop?.ok).toBe(false);
      if (result.loop && !result.loop.ok) {
        expect(result.loop.reason).toBe('loop threw');
      }
      expect(result.released).toBe(true);
      expect(tracker.hasAvailableTarget()).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('sets ensureCommit to working_tree_dirty when worktree has uncommitted changes after loop', async () => {
    const dir = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    const { writeFileSync } = await import('node:fs');
    try {
      const result = await runWorktreeWorkflow({
        acquire: {
          baseBranch: 'main',
          branchName: 'ralph/dirty-after',
          lockedBy: 'job-1',
        },
        ensureCommit: { runChecks: false },
        runLoop: async () => {
          writeFileSync(join(dir, 'dirty.txt'), 'dirty', 'utf-8');
          return { ok: true };
        },
        tracker,
      });
      expect(result.acquire.ok).toBe(true);
      expect(result.loop?.ok).toBe(true);
      expect(result.ensureCommit?.ok).toBe(false);
      if (result.ensureCommit && !result.ensureCommit.ok) {
        expect(result.ensureCommit.reason).toBe('working_tree_dirty');
      }
      expect(result.released).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('runWorktreeWorkflow with throwing ensureCommit', () => {
  it('releases the target and reports a failed ensureCommit when ensureCommit throws', async () => {
    // ensureCommit shells out via spawnSync git and could throw (now or via a
    // future hook). Stub it to throw and assert the lock is still released so
    // the in-memory pool never permanently loses a slot.
    vi.resetModules();
    vi.doMock('../parent-job', async () => {
      const actual =
        await vi.importActual<typeof import('../parent-job')>('../parent-job');
      return {
        ...actual,
        parentJobEnsureCommitBeforeRelease: () => {
          throw new Error('ensure-commit spawn boom');
        },
      };
    });

    const { runWorktreeWorkflow: runWithMock } = await import('../workflow');
    const { WorktreeTargetsTracker: TrackerWithMock } =
      await import('../worktree-targets');

    const dir = createTempGitRepo();
    const tracker = new TrackerWithMock([{ id: 'wt1', path: dir }]);
    try {
      const result = await runWithMock({
        acquire: {
          baseBranch: 'main',
          branchName: 'ralph/throw-ensure',
          lockedBy: 'job-1',
        },
        ensureCommit: { runChecks: false },
        runLoop: async () => ({ ok: true }),
        tracker,
      });
      expect(result.acquire.ok).toBe(true);
      expect(result.loop?.ok).toBe(true);
      expect(result.ensureCommit?.ok).toBe(false);
      if (result.ensureCommit && !result.ensureCommit.ok) {
        expect(result.ensureCommit.reason).toBe('working_tree_dirty');
      }
      expect(result.released).toBe(true);
      expect(tracker.hasAvailableTarget()).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
      vi.doUnmock('../parent-job');
      vi.resetModules();
    }
  });
});
