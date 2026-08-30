import { describe, expect, test } from 'vitest';
import {
  WorktreeDiscoveryProblemKind,
  WorktreeRootSource,
} from '~/__generated__/graphql';
import { mockDiscoveredWorktrees } from '~/routing/settings/repositories/data/mock.repositories';
import {
  WORKTREE_PROBLEM_GROUP,
  summarizeDiscovery,
} from '../discovery-problems';
import type { DiscoveredWorktreesResult } from '~/routing/settings/repositories/data/types';

const problem = (
  kind: WorktreeDiscoveryProblemKind,
  overrides: Partial<DiscoveredWorktreesResult['problems'][number]> = {},
): DiscoveredWorktreesResult['problems'][number] => ({
  detail: 'something happened',
  kind,
  path: '/srv/worktrees/wt-a',
  repositoryId: null,
  ...overrides,
});

const root = (
  overrides: Partial<DiscoveredWorktreesResult['scannedRoots'][number]> = {},
): DiscoveredWorktreesResult['scannedRoots'][number] => ({
  exists: true,
  path: '/srv/worktrees/org/repo',
  source: WorktreeRootSource.Default,
  worktreeCount: 1,
  ...overrides,
});

describe('summarizeDiscovery', () => {
  test('produces no groups for a healthy scan', () => {
    const summary = summarizeDiscovery(mockDiscoveredWorktrees());

    expect(summary.groups).toEqual([]);
    expect(summary.problemCount).toBe(0);
  });

  test('counts roots that do not exist yet instead of listing them', () => {
    const summary = summarizeDiscovery(
      mockDiscoveredWorktrees({
        scannedRoots: [
          root(),
          root({ exists: false, path: '/srv/worktrees/org/other' }),
          root({ exists: false, path: '/srv/worktrees/org/third' }),
        ],
      }),
    );

    expect(summary.emptyRootCount).toBe(2);
    expect(summary.groups).toEqual([]);
  });

  test('collapses stale git entries into one group carrying the remedy', () => {
    const summary = summarizeDiscovery(
      mockDiscoveredWorktrees({
        problems: [
          problem(WorktreeDiscoveryProblemKind.StaleWorktreeEntry),
          problem(WorktreeDiscoveryProblemKind.StaleWorktreeEntry, {
            path: '/srv/worktrees/wt-b',
          }),
        ],
      }),
    );

    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0].id).toBe(WORKTREE_PROBLEM_GROUP.STALE);
    expect(summary.groups[0].details).toHaveLength(2);
    expect(summary.groups[0].remedy).toContain('git worktree prune');
    expect(summary.groups[0].summary).toMatch(/^2 worktrees/);
  });

  test('merges every unreadable kind into one degraded group', () => {
    const summary = summarizeDiscovery(
      mockDiscoveredWorktrees({
        problems: [
          problem(WorktreeDiscoveryProblemKind.RootUnreadable),
          problem(WorktreeDiscoveryProblemKind.ProbeFailed, {
            path: '/srv/worktrees/wt-b',
          }),
          problem(WorktreeDiscoveryProblemKind.CheckoutListFailed, {
            path: null,
          }),
        ],
      }),
    );

    expect(summary.groups).toHaveLength(1);
    expect(summary.groups[0].id).toBe(WORKTREE_PROBLEM_GROUP.DEGRADED);
    expect(summary.groups[0].details).toHaveLength(3);
    expect(summary.problemCount).toBe(3);
  });

  test('leaves the cap and per-repository conditions out of the groups', () => {
    const summary = summarizeDiscovery(
      mockDiscoveredWorktrees({
        problems: [
          problem(WorktreeDiscoveryProblemKind.CapExceeded, { path: null }),
          problem(WorktreeDiscoveryProblemKind.NotAGitRepo, {
            repositoryId: 'repo-1',
          }),
        ],
      }),
    );

    // droppedCount renders its own line; NOT_A_GIT_REPO belongs on the repository's row.
    expect(summary.groups).toEqual([]);
    expect(summary.problemCount).toBe(0);
  });
});
