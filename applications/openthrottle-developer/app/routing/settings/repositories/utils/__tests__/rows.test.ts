import { describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
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
    expect(rows[0].checkout.id).toBe('primary-1');
    expect(rows[0].isWorktree).toBe(false);
    expect(rows[0].repositoryName).toBe('monorepo');
    expect(rows[0].children?.map((child) => child.checkout.id)).toEqual([
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

    expect(rows.map((row) => row.checkout.id)).toEqual([
      'primary-1',
      'primary-2',
    ]);
    expect(rows[0].children?.map((child) => child.checkout.id)).toEqual([
      'worktree-1',
    ]);
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
    expect(rows[0].checkout.id).toBe('worktree-1');
    expect(rows[0].isWorktree).toBe(true);
    expect(rows[0].children?.map((child) => child.checkout.id)).toEqual([
      'worktree-2',
    ]);
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
