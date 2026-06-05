/**
 * @description Tests for parent job: acquire target and create branch; ensure commit before release.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createBranchInWorktree,
  deriveBranchName,
  isWorktreeClean,
  parentJobAcquireAndCreateBranch,
  parentJobEnsureCommitBeforeRelease,
  slugifyForBranch,
} from '../parent-job';
import { WorktreeTargetsTracker } from '../worktree-targets';

/** Creates a temp dir with a git repo that has main and one commit. */
function createTempGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'parent-job-git-'));
  spawnSync('git', ['init', '-b', 'main'], { cwd: dir, encoding: 'utf-8' });
  spawnSync('git', ['commit', '--allow-empty', '-m', 'init'], {
    cwd: dir,
    encoding: 'utf-8',
  });
  return dir;
}

describe('slugifyForBranch', () => {
  describe('normal title conversion', () => {
    it('converts "Add login feature" to "add-login-feature"', () => {
      expect(slugifyForBranch('Add login feature')).toBe('add-login-feature');
    });

    it('converts simple title with spaces to hyphenated lowercase', () => {
      expect(slugifyForBranch('Human readable branch names')).toBe(
        'human-readable-branch-names',
      );
    });

    it('handles mixed case properly', () => {
      expect(slugifyForBranch('MyFeature NAME Test')).toBe(
        'myfeature-name-test',
      );
    });
  });

  describe('special characters removal', () => {
    it('converts "Fix: user@email.com bug" to "fix-user-email-com-bug"', () => {
      expect(slugifyForBranch('Fix: user@email.com bug')).toBe(
        'fix-user-email-com-bug',
      );
    });

    it('removes parentheses and other special chars', () => {
      expect(slugifyForBranch('Feature (beta) - v2.0')).toBe(
        'feature-beta-v2-0',
      );
    });

    it('handles unicode characters by replacing with hyphens', () => {
      expect(slugifyForBranch('Améliorer le système')).toBe(
        'am-liorer-le-syst-me',
      );
    });

    it('handles symbols like !, ?, #, $, %, etc.', () => {
      expect(slugifyForBranch('What?! Is #1 feature $100')).toBe(
        'what-is-1-feature-100',
      );
    });

    it('handles forward slashes', () => {
      expect(slugifyForBranch('feature/branch/test')).toBe(
        'feature-branch-test',
      );
    });

    it('handles backslashes', () => {
      expect(slugifyForBranch('path\\to\\feature')).toBe('path-to-feature');
    });
  });

  describe('consecutive hyphens collapse', () => {
    it('converts "Hello---World" to "hello-world"', () => {
      expect(slugifyForBranch('Hello---World')).toBe('hello-world');
    });

    it('collapses hyphens created by multiple special chars', () => {
      expect(slugifyForBranch('Test :: Feature')).toBe('test-feature');
    });

    it('handles mixed spaces and hyphens', () => {
      expect(slugifyForBranch('Test - - Feature')).toBe('test-feature');
    });

    it('handles title with multiple consecutive spaces', () => {
      expect(slugifyForBranch('Hello    World')).toBe('hello-world');
    });
  });

  describe('trimming hyphens from start/end', () => {
    it('removes leading hyphens', () => {
      expect(slugifyForBranch('---leading')).toBe('leading');
    });

    it('removes trailing hyphens', () => {
      expect(slugifyForBranch('trailing---')).toBe('trailing');
    });

    it('removes both leading and trailing hyphens', () => {
      expect(slugifyForBranch('--both--')).toBe('both');
    });

    it('removes leading special chars that become hyphens', () => {
      expect(slugifyForBranch('...Feature')).toBe('feature');
    });

    it('removes trailing special chars that become hyphens', () => {
      expect(slugifyForBranch('Feature...')).toBe('feature');
    });
  });

  describe('truncation at 50 chars', () => {
    it('truncates titles longer than 50 characters', () => {
      const longTitle =
        'This is a very long plan title that exceeds fifty characters easily';
      const result = slugifyForBranch(longTitle);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('does not leave trailing hyphen after truncation', () => {
      const longTitle =
        'This is a very long plan title that exceeds fifty characters easily';
      const result = slugifyForBranch(longTitle);
      expect(result).not.toMatch(/-$/);
    });

    it('preserves titles at exactly 50 characters', () => {
      const fiftyCharTitle = 'abcdefghij'.repeat(5);
      expect(slugifyForBranch(fiftyCharTitle).length).toBe(50);
    });

    it('does not truncate titles shorter than 50 characters', () => {
      const shortTitle = 'Short title';
      const result = slugifyForBranch(shortTitle);
      expect(result).toBe('short-title');
      expect(result.length).toBeLessThan(50);
    });
  });

  describe('empty/whitespace-only input handling', () => {
    it('returns empty string for empty input', () => {
      expect(slugifyForBranch('')).toBe('');
    });

    it('returns empty string for whitespace-only input', () => {
      expect(slugifyForBranch('   ')).toBe('');
    });

    it('returns empty string for tabs-only input', () => {
      expect(slugifyForBranch('\t\t')).toBe('');
    });

    it('returns empty string for newlines-only input', () => {
      expect(slugifyForBranch('\n\n')).toBe('');
    });

    it('returns empty string for mixed whitespace-only input', () => {
      expect(slugifyForBranch(' \t \n ')).toBe('');
    });
  });

  describe('already valid slug input', () => {
    it('returns same value for already valid lowercase slug', () => {
      expect(slugifyForBranch('already-valid-slug')).toBe('already-valid-slug');
    });

    it('converts uppercase valid format to lowercase', () => {
      expect(slugifyForBranch('ALREADY-VALID-SLUG')).toBe('already-valid-slug');
    });

    it('preserves numbers in slug', () => {
      expect(slugifyForBranch('feature-123-test')).toBe('feature-123-test');
    });
  });

  describe('edge cases', () => {
    it('handles single character input', () => {
      expect(slugifyForBranch('a')).toBe('a');
    });

    it('handles single special character (returns empty)', () => {
      expect(slugifyForBranch('@')).toBe('');
    });

    it('handles numbers only', () => {
      expect(slugifyForBranch('12345')).toBe('12345');
    });

    it('handles title that becomes empty after processing', () => {
      expect(slugifyForBranch('!@#$%')).toBe('');
    });
  });
});

describe('deriveBranchName', () => {
  describe('with planTitle (produces ralph/{slug}-{suffix} format)', () => {
    it('uses planTitle when provided, producing ralph/{slug}-{suffix} format', () => {
      const name = deriveBranchName('job-1', 'Human-readable branch names');
      expect(name).toMatch(/^ralph\/human-readable-branch-names-[a-z0-9]{6}$/);
    });

    it('generates a 6-character base36 suffix', () => {
      const name = deriveBranchName('job-1', 'Test Plan');
      const suffix = name.split('-').pop();
      expect(suffix).toBeDefined();
      expect(suffix?.length).toBe(6);
      expect(suffix).toMatch(/^[a-z0-9]{6}$/);
    });

    it('produces different suffixes for same planTitle at different times', () => {
      const name1 = deriveBranchName('job-1', 'Test Plan');
      const name2 = deriveBranchName('job-1', 'Test Plan');
      const suffix1 = name1.split('-').pop();
      const suffix2 = name2.split('-').pop();
      expect(suffix1).toBeDefined();
      expect(suffix2).toBeDefined();
    });

    it('keeps total branch name length under 100 chars for safety margin', () => {
      const longTitle =
        'This is a very long plan title that exceeds fifty characters easily and should be truncated';
      const name = deriveBranchName('job-1', longTitle);
      expect(name.length).toBeLessThan(100);
      expect(name).toMatch(/^ralph\/.+-[a-z0-9]{6}$/);
    });

    it('handles planTitle with special characters', () => {
      const name = deriveBranchName('job-1', 'Fix: bug #123 (critical!)');
      expect(name).toMatch(/^ralph\/fix-bug-123-critical-[a-z0-9]{6}$/);
    });

    it('handles planTitle that slugifies to less than 50 chars', () => {
      const name = deriveBranchName('job-1', 'Short title');
      expect(name).toMatch(/^ralph\/short-title-[a-z0-9]{6}$/);
      expect(name.length).toBeLessThan(100);
    });
  });

  describe('without planTitle (backwards-compatible behavior)', () => {
    it('returns ralph/slug-timestamp format when no planTitle provided', () => {
      const name = deriveBranchName('job-abc-123');
      expect(name).toMatch(/^ralph\/job-abc-123-\d+$/);
    });

    it('sanitizes non-alphanumeric chars in lockedBy (keeps underscore)', () => {
      const name = deriveBranchName('job/x.y_z');
      expect(name).toMatch(/^ralph\/job-x-y_z-\d+$/);
    });

    it('falls back to lockedBy when planTitle is empty string', () => {
      const name = deriveBranchName('job-abc', '');
      expect(name).toMatch(/^ralph\/job-abc-\d+$/);
    });

    it('falls back to lockedBy when planTitle is whitespace only', () => {
      const name = deriveBranchName('job-abc', '   ');
      expect(name).toMatch(/^ralph\/job-abc-\d+$/);
    });

    it('falls back to lockedBy when planTitle contains only special chars', () => {
      const name = deriveBranchName('job-abc', '!@#$%');
      expect(name).toMatch(/^ralph\/job-abc-\d+$/);
    });

    it('truncates lockedBy to 12 characters in fallback mode', () => {
      const longLockedBy = 'very-long-job-identifier-that-exceeds-limit';
      const name = deriveBranchName(longLockedBy);
      expect(name).toMatch(/^ralph\/very-long-jo-\d+$/);
    });

    it('uses numeric timestamp in fallback mode', () => {
      const name = deriveBranchName('job-1');
      const timestamp = name.split('-').pop();
      expect(timestamp).toBeDefined();
      expect(Number(timestamp)).toBeGreaterThan(0);
    });
  });
});

describe('createBranchInWorktree', () => {
  it('returns ok: false with stderr when path is not a git repo', () => {
    const result = createBranchInWorktree('/nonexistent', 'branch', 'main');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stderr).toBeDefined();
      expect(result.stderr.length).toBeGreaterThan(0);
    }
  });

  it('returns ok: true when branch is created in a real git repo', () => {
    const dir = createTempGitRepo();
    try {
      const result = createBranchInWorktree(dir, 'feature/test', 'main');
      expect(result.ok).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('parentJobAcquireAndCreateBranch', () => {
  it('returns acquire_failed when tracker has no targets', async () => {
    const tracker = new WorktreeTargetsTracker();
    const result = await parentJobAcquireAndCreateBranch(tracker, {
      lockedBy: 'job-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('acquire_failed');
      expect(result.detail).toBe('no_targets');
    }
  });

  it('returns create_branch_failed and releases target when git checkout fails', async () => {
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: '/not-a-git-repo-path' },
    ]);
    const result = await parentJobAcquireAndCreateBranch(tracker, {
      branchName: 'feature/test',
      lockedBy: 'job-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('create_branch_failed');
      expect(result.detail).toBeDefined();
    }
    expect(tracker.hasAvailableTarget()).toBe(true);
    expect(tracker.getAvailableTarget()?.id).toBe('wt1');
  });

  it('returns handoff when target acquired and branch created in real git repo', async () => {
    const dir = createTempGitRepo();

    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      const result = await parentJobAcquireAndCreateBranch(tracker, {
        baseBranch: 'main',
        branchName: 'ralph/test-branch',
        lockedBy: 'job-abc',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.handoff.targetId).toBe('wt1');
        expect(result.handoff.worktreePath).toBe(dir);
        expect(result.handoff.branchName).toBe('ralph/test-branch');
      }
      expect(tracker.hasAvailableTarget()).toBe(false);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('derives branch name when branchName not provided', async () => {
    const dir = createTempGitRepo();

    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      const result = await parentJobAcquireAndCreateBranch(tracker, {
        baseBranch: 'main',
        lockedBy: 'my-job-id',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.handoff.branchName).toMatch(/^ralph\/my-job-id-\d+$/);
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('acquires specified worktree when worktreeId is provided and available', async () => {
    const dir1 = createTempGitRepo();
    const dir2 = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([
      { id: 'wt1', path: dir1 },
      { id: 'wt2', path: dir2 },
    ]);
    try {
      const result = await parentJobAcquireAndCreateBranch(tracker, {
        baseBranch: 'main',
        lockedBy: 'job-1',
        worktreeId: 'wt2',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.handoff.targetId).toBe('wt2');
        expect(result.handoff.worktreePath).toBe(dir2);
      }
      expect(tracker.hasAvailableTarget()).toBe(true);
      expect(tracker.getAvailableTarget()?.id).toBe('wt1');
    } finally {
      rmSync(dir1, { force: true, recursive: true });
      rmSync(dir2, { force: true, recursive: true });
    }
  });

  it('returns acquire_failed when worktreeId is provided but target not available', async () => {
    const dir = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      tracker.acquire({ id: 'wt1', lockedBy: 'other-job' });
      const result = await parentJobAcquireAndCreateBranch(tracker, {
        lockedBy: 'job-1',
        worktreeId: 'wt1',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('acquire_failed');
        expect(result.detail).toBe('all_locked');
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns acquire_failed when worktreeId is provided but id not found', async () => {
    const dir = createTempGitRepo();
    const tracker = new WorktreeTargetsTracker([{ id: 'wt1', path: dir }]);
    try {
      const result = await parentJobAcquireAndCreateBranch(tracker, {
        lockedBy: 'job-1',
        worktreeId: 'wt-missing',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('acquire_failed');
        expect(result.detail).toBe('id_not_found');
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('isWorktreeClean', () => {
  it('returns true when working tree has no changes', () => {
    const dir = createTempGitRepo();
    try {
      expect(isWorktreeClean(dir)).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns false when there are uncommitted files', () => {
    const dir = createTempGitRepo();
    try {
      writeFileSync(join(dir, 'untracked.txt'), 'hello');
      expect(isWorktreeClean(dir)).toBe(false);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});

describe('parentJobEnsureCommitBeforeRelease (commit/clean-only)', () => {
  it('returns working_tree_dirty when worktree has uncommitted changes', async () => {
    const dir = createTempGitRepo();
    const handoff = {
      branchName: 'ralph/test',
      targetId: 'wt1',
      worktreePath: dir,
    };
    try {
      writeFileSync(join(dir, 'dirty.txt'), 'dirty');
      const result = await parentJobEnsureCommitBeforeRelease(handoff);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('working_tree_dirty');
        if (result.reason === 'working_tree_dirty') {
          expect(result.detail).toBeDefined();
        }
      }
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('returns ok: true when worktree is clean (no nx checks run)', async () => {
    const dir = createTempGitRepo();
    const handoff = {
      branchName: 'ralph/test',
      targetId: 'wt1',
      worktreePath: dir,
    };
    try {
      const result = await parentJobEnsureCommitBeforeRelease(handoff);
      expect(result.ok).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });

  it('ignores legacy runChecks/base options and only verifies clean', async () => {
    const dir = createTempGitRepo();
    const handoff = {
      branchName: 'ralph/test',
      targetId: 'wt1',
      worktreePath: dir,
    };
    try {
      const result = await parentJobEnsureCommitBeforeRelease(handoff, {
        base: 'main',
        runChecks: true,
      });
      expect(result.ok).toBe(true);
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
