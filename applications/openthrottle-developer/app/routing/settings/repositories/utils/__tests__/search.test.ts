import { describe, expect, test } from 'vitest';
import {
  mockCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';
import { buildRepositoryRows } from '../rows';
import { filterRepositoryRows } from '../search';

const rows = buildRepositoryRows([
  mockRepository({
    checkouts: [
      mockCheckout({
        branch: 'main',
        displayName: 'openthrottle',
        filesystemPath: '/Users/dev/Development/openthrottle',
        id: 'primary-1',
      }),
      mockCheckout({
        branch: 'loop-plan-repositories',
        displayName: 'openthrottle-worktree',
        filesystemPath: '/Users/dev/Development/worktrees/repositories-table',
        id: 'worktree-1',
        kind: 'worktree',
      }),
    ],
    id: 'repo-1',
    name: 'monorepo',
    normalizedRemoteUrl: 'https://github.com/OpenThrottle/monorepo',
  }),
  mockRepository({
    checkouts: [
      mockCheckout({
        branch: 'main',
        displayName: 'website',
        filesystemPath: '/Users/dev/Development/website',
        id: 'primary-2',
      }),
    ],
    id: 'repo-2',
    name: 'website',
    normalizedRemoteUrl: 'https://github.com/OpenThrottle/website',
  }),
]);

describe('filterRepositoryRows', () => {
  test('returns every row untouched for an empty search', () => {
    const result = filterRepositoryRows(rows, '   ');

    expect(result.rows).toBe(rows);
    expect(result.autoExpandedIds).toEqual([]);
  });

  test('matches the repository name case-insensitively and keeps all children', () => {
    const result = filterRepositoryRows(rows, 'MONO');

    expect(result.rows.map((row) => row.id)).toEqual(['primary-1']);
    expect(result.rows[0].children?.map((child) => child.id)).toEqual([
      'worktree-1',
    ]);
    expect(result.autoExpandedIds).toEqual([]);
  });

  test('matches a checkout display name', () => {
    const result = filterRepositoryRows(rows, 'website');

    expect(result.rows.map((row) => row.id)).toEqual(['primary-2']);
  });

  test('matches a filesystem path', () => {
    const result = filterRepositoryRows(rows, 'development/website');

    expect(result.rows.map((row) => row.id)).toEqual(['primary-2']);
  });

  test('matches a remote url', () => {
    const result = filterRepositoryRows(
      rows,
      'github.com/openthrottle/website',
    );

    expect(result.rows.map((row) => row.id)).toEqual(['primary-2']);
  });

  test('pulls the parent in when only a child matches, and flags it for auto-expand', () => {
    const result = filterRepositoryRows(rows, 'loop-plan-repositories');

    expect(result.rows.map((row) => row.id)).toEqual(['primary-1']);
    expect(result.rows[0].children?.map((child) => child.id)).toEqual([
      'worktree-1',
    ]);
    expect(result.autoExpandedIds).toEqual(['primary-1']);
  });

  test('narrows a parent to only its matching children', () => {
    const wide = buildRepositoryRows([
      mockRepository({
        checkouts: [
          mockCheckout({ displayName: 'root', id: 'primary-1' }),
          mockCheckout({
            displayName: 'alpha-worktree',
            id: 'worktree-1',
            kind: 'worktree',
          }),
          mockCheckout({
            displayName: 'beta-worktree',
            id: 'worktree-2',
            kind: 'worktree',
          }),
        ],
        id: 'repo-1',
        name: 'repo',
        normalizedRemoteUrl: null,
      }),
    ]);

    const result = filterRepositoryRows(wide, 'alpha');

    expect(result.rows[0].children?.map((child) => child.id)).toEqual([
      'worktree-1',
    ]);
    expect(result.autoExpandedIds).toEqual(['primary-1']);
  });

  test('drops rows that match nowhere', () => {
    const result = filterRepositoryRows(rows, 'nothing-matches-this');

    expect(result.rows).toEqual([]);
    expect(result.autoExpandedIds).toEqual([]);
  });
});
