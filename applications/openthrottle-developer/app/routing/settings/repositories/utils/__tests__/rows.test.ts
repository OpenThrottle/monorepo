import {
  WorktreeActivity,
  WorktreeDiscoveryProblemKind,
} from '~/__generated__/graphql';
import { describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockDiscoveredWorktree,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import { buildRepositoryRows } from '../rows';

describe('buildRepositoryRows', () => {
  test('makes the primary checkout the parent and worktrees its children', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ id: 'primary-1' }),
          mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
          mockCheckout({ id: 'worktree-2', kind: 'worktree' }),
        ],
        id: 'repo-1',
        name: 'monorepo',
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('primary-1');
    expect(rows[0].isWorktree).toBe(false);
    expect(rows[0].repositoryName).toBe('monorepo');
    expect(rows[0].children?.map((child) => child.id)).toEqual([
      'worktree-1',
      'worktree-2',
    ]);
    expect(rows[0].children?.every((child) => child.isWorktree)).toBe(true);
  });

  test('leaves children undefined when a repository has no worktrees', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [mockCheckout({ id: 'primary-1' })],
        id: 'repo-1',
      }),
    ]);

    expect(rows[0].children).toBeUndefined();
  });

  test('skips a repository with zero checkouts', () => {
    const rows = buildRepositoryRows([
      mockRepository({ checkouts: [], id: 'repo-empty' }),
      mockRepository({
        checkouts: [mockCheckout({ id: 'primary-1' })],
        id: 'repo-1',
      }),
    ]);

    expect(rows.map((row) => row.repositoryId)).toEqual(['repo-1']);
  });

  test('emits one parent row per primary checkout, attaching worktrees to the first', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ id: 'primary-1' }),
          mockCheckout({ id: 'primary-2' }),
          mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
        ],
        id: 'repo-1',
      }),
    ]);

    expect(rows.map((row) => row.id)).toEqual(['primary-1', 'primary-2']);
    expect(rows[0].children?.map((child) => child.id)).toEqual(['worktree-1']);
    expect(rows[1].children).toBeUndefined();
  });

  test('promotes the first worktree when a repository has no primary checkout', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
          mockCheckout({ id: 'worktree-2', kind: 'worktree' }),
        ],
        id: 'repo-1',
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('worktree-1');
    expect(rows[0].isWorktree).toBe(true);
    expect(rows[0].children?.map((child) => child.id)).toEqual(['worktree-2']);
  });

  test('resolves the branch from inspection, then the repository default, then null', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [mockCheckout({ branch: 'feature/x', id: 'inspected' })],
        defaultBranch: 'main',
        id: 'repo-1',
      }),
      mockRepository({
        checkouts: [mockCheckout({ id: 'uninspected' })],
        defaultBranch: 'trunk',
        id: 'repo-2',
      }),
      mockRepository({
        checkouts: [mockCheckout({ id: 'branchless' })],
        defaultBranch: null,
        id: 'repo-3',
      }),
    ]);

    expect(rows.map((row) => row.branch)).toEqual(['feature/x', 'trunk', null]);
  });

  test('carries the repository remote url onto every row', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ id: 'primary-1' }),
          mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
        ],
        id: 'repo-1',
        normalizedRemoteUrl: null,
      }),
    ]);

    expect(rows[0].remoteUrl).toBeNull();
    expect(rows[0].children?.[0].remoteUrl).toBeNull();
  });

  test('rolls the injection opt-in up so every row of a repository agrees', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ id: 'primary-1' }),
          mockCheckout({
            foreignSkillInjectionEnabled: true,
            id: 'worktree-1',
            kind: 'worktree',
          }),
        ],
        id: 'repo-1',
      }),
    ]);

    // The flag is stored per checkout but flipped for all of them together, so a
    // single opted-in checkout makes the whole repository read as enabled.
    expect(rows[0].foreignSkillInjectionEnabled).toBe(true);
    expect(rows[0].children?.[0].foreignSkillInjectionEnabled).toBe(true);
  });

  test('reads a repository with no opted-in checkout as disabled', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ id: 'primary-1' }),
          mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
        ],
        id: 'repo-1',
      }),
    ]);

    expect(rows[0].foreignSkillInjectionEnabled).toBe(false);
    expect(rows[0].children?.[0].foreignSkillInjectionEnabled).toBe(false);
  });
});

describe('buildRepositoryRows with discovered worktrees', () => {
  test('adds an unregistered worktree as a child of the first primary row', () => {
    const rows = buildRepositoryRows(
      [
        mockRepository({
          checkouts: [mockCheckout({ id: 'primary-1' })],
          id: 'repo-1',
          name: 'monorepo',
        }),
      ],
      [
        mockDiscoveredWorktree({
          activity: WorktreeActivity.Dirty,
          name: 'wt-a',
        }),
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].children).toHaveLength(1);
    expect(rows[0].children?.[0]).toMatchObject({
      activity: WorktreeActivity.Dirty,
      checkout: null,
      displayName: 'wt-a',
      isWorktree: true,
      repositoryId: 'repo-1',
      repositoryName: 'monorepo',
      unregistered: true,
    });
  });

  test('collapses a registered checkout and its discovered scan into ONE row', () => {
    const rows = buildRepositoryRows(
      [
        mockRepository({
          checkouts: [
            mockCheckout({ id: 'primary-1' }),
            mockCheckout({
              filesystemPath: '/Users/dev/wt-a',
              id: 'worktree-1',
              kind: 'worktree',
            }),
          ],
          id: 'repo-1',
        }),
      ],
      [
        mockDiscoveredWorktree({
          activity: WorktreeActivity.Running,
          checkoutId: 'worktree-1',
          name: 'wt-a',
          planId: 'plan-1',
          planRunId: 'run-1',
        }),
      ],
    );

    expect(rows[0].children).toHaveLength(1);
    expect(rows[0].children?.[0]).toMatchObject({
      activity: WorktreeActivity.Running,
      id: 'worktree-1',
      planId: 'plan-1',
      planRunId: 'run-1',
      unregistered: false,
    });
  });

  test('prefers the live scan branch over the cached inspection branch', () => {
    const rows = buildRepositoryRows(
      [
        mockRepository({
          checkouts: [
            mockCheckout({ branch: 'stale-branch', id: 'primary-1' }),
          ],
          id: 'repo-1',
        }),
      ],
      [
        mockDiscoveredWorktree({
          branch: 'live-branch',
          checkoutId: 'primary-1',
          name: 'openthrottle',
        }),
      ],
    );

    expect(rows[0].branch).toBe('live-branch');
  });

  test('leaves a row without a matching scan unbadged rather than calling it idle', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [mockCheckout({ id: 'primary-1' })],
        id: 'repo-1',
      }),
    ]);

    expect(rows[0].activity).toBeNull();
    expect(rows[0].unregistered).toBe(false);
  });

  test('groups worktrees with no registered repository under a promoted parent row', () => {
    const rows = buildRepositoryRows(
      [],
      [
        mockDiscoveredWorktree({ name: 'wt-a', repositoryId: null }),
        mockDiscoveredWorktree({ name: 'wt-b', repositoryId: null }),
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      displayName: 'wt-a',
      repositoryId: null,
      repositoryName: REPOSITORIES_TABLE_COPY.unlinkedGroupName,
    });
    expect(rows[0].children?.map((child) => child.displayName)).toEqual([
      'wt-b',
    ]);
  });

  test('does not drop a worktree whose repository has zero checkouts', () => {
    const rows = buildRepositoryRows(
      [mockRepository({ checkouts: [], id: 'repo-1' })],
      [mockDiscoveredWorktree({ name: 'wt-a', repositoryId: 'repo-1' })],
    );

    expect(rows.map((row) => row.displayName)).toEqual(['wt-a']);
  });

  test('flags only the repository a NOT_A_GIT_REPO problem names', () => {
    const rows = buildRepositoryRows(
      [
        mockRepository({
          checkouts: [mockCheckout({ id: 'primary-1' })],
          id: 'repo-1',
        }),
        mockRepository({
          checkouts: [mockCheckout({ id: 'primary-2' })],
          id: 'repo-2',
        }),
      ],
      [],
      [
        {
          detail: 'fatal: not a git repository',
          kind: WorktreeDiscoveryProblemKind.NotAGitRepo,
          path: '/Users/dev/Desktop/example-folder',
          repositoryId: 'repo-2',
        },
      ],
    );

    expect(rows.map((row) => row.notAGitRepository)).toEqual([false, true]);
  });

  test('flags nothing when discovery reported no such problem', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [mockCheckout({ id: 'primary-1' })],
        id: 'repo-1',
      }),
    ]);

    expect(rows[0].notAGitRepository).toBe(false);
  });

  test('keeps the tree exactly two levels deep', () => {
    const rows = buildRepositoryRows(
      [
        mockRepository({
          checkouts: [
            mockCheckout({ id: 'primary-1' }),
            mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
          ],
          id: 'repo-1',
        }),
      ],
      [mockDiscoveredWorktree({ name: 'wt-a' })],
    );

    expect(
      rows[0].children?.every((child) => child.children === undefined),
    ).toBe(true);
  });
});
