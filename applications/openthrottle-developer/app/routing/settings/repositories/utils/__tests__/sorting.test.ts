import { describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { buildRepositoryRows } from '../rows';
import { sortRepositoryRows } from '../sorting';

const rows = buildRepositoryRows([
  mockRepository({
    checkouts: [
      mockCheckout({
        displayName: 'website',
        id: 'primary-website',
        updatedAt: '2026-07-20T00:00:00.000Z',
      }),
    ],
    id: 'repo-website',
    name: 'website',
  }),
  mockRepository({
    checkouts: [
      mockCheckout({
        displayName: 'monorepo',
        id: 'primary-mono',
        updatedAt: '2026-07-25T00:00:00.000Z',
      }),
      mockCheckout({
        displayName: 'zeta-worktree',
        id: 'worktree-zeta',
        kind: 'worktree',
        updatedAt: '2026-07-10T00:00:00.000Z',
      }),
      mockCheckout({
        displayName: 'alpha-worktree',
        id: 'worktree-alpha',
        kind: 'worktree',
        updatedAt: '2026-07-30T00:00:00.000Z',
      }),
    ],
    id: 'repo-mono',
    name: 'monorepo',
  }),
]);

describe('sortRepositoryRows', () => {
  test('sorts parents by repository name ascending', () => {
    const sorted = sortRepositoryRows(rows, 'name', 'asc');

    expect(sorted.map((row) => row.repositoryName)).toEqual([
      'monorepo',
      'website',
    ]);
  });

  test('sorts parents by repository name descending', () => {
    const sorted = sortRepositoryRows(rows, 'name', 'desc');

    expect(sorted.map((row) => row.repositoryName)).toEqual([
      'website',
      'monorepo',
    ]);
  });

  test('sorts children within their parent only', () => {
    const sorted = sortRepositoryRows(rows, 'name', 'asc');

    expect(sorted[0].children?.map((child) => child.id)).toEqual([
      'worktree-alpha',
      'worktree-zeta',
    ]);
    expect(sorted.map((row) => row.id)).toEqual([
      'primary-mono',
      'primary-website',
    ]);
  });

  test('sorts by updatedAt', () => {
    const sorted = sortRepositoryRows(rows, 'updatedAt', 'desc');

    expect(sorted.map((row) => row.id)).toEqual([
      'primary-mono',
      'primary-website',
    ]);
    expect(sorted[0].children?.map((child) => child.id)).toEqual([
      'worktree-alpha',
      'worktree-zeta',
    ]);
  });

  test('sorts by checkout count, counting a parent plus its children', () => {
    const sorted = sortRepositoryRows(rows, 'checkoutCount', 'desc');

    expect(sorted.map((row) => row.id)).toEqual([
      'primary-mono',
      'primary-website',
    ]);
  });

  test('leaves the input array untouched', () => {
    const before = rows.map((row) => row.id);
    sortRepositoryRows(rows, 'name', 'desc');

    expect(rows.map((row) => row.id)).toEqual(before);
  });
});
