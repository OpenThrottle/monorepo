import { describe, expect, test } from 'vitest';

import {
  mockCheckout,
  mockDiscoveredWorktree,
  mockDiscoveredWorktrees,
  mockMissingCheckout,
  mockRepository,
} from '~/routing/settings/repositories/testing/mock-repositories';
import type { BuildRepositoriesViewParams } from '~/routing/settings/repositories/utils/repositories-view';
import { buildRepositoriesView } from '~/routing/settings/repositories/utils/repositories-view';

const repositories = [
  mockRepository({
    checkouts: [
      mockCheckout({
        displayName: 'openthrottle',
        filesystemPath: '/Users/dev/openthrottle',
        id: 'checkout-1',
      }),
      mockCheckout({
        branch: 'loop-plan',
        displayName: 'openthrottle-worktree',
        id: 'worktree-1',
        kind: 'worktree',
      }),
    ],
    id: 'repo-1',
    name: 'OpenThrottle',
  }),
  mockRepository({
    checkouts: [mockCheckout({ displayName: 'website', id: 'checkout-2' })],
    id: 'repo-2',
    name: 'website',
  }),
];

const params = (
  query: string,
  overrides: Partial<BuildRepositoriesViewParams> = {},
): BuildRepositoriesViewParams => {
  return {
    discoveredWorktrees: mockDiscoveredWorktrees(),
    repositories,
    searchParams: new URLSearchParams(query),
    ...overrides,
  };
};

describe('buildRepositoriesView', () => {
  test('nests worktree checkouts under their repository row', () => {
    const view = buildRepositoriesView(params(''));

    expect(view.rows.map((row) => row.id)).toEqual([
      'checkout-1',
      'checkout-2',
    ]);
    expect(view.rows[0]?.children).toHaveLength(1);
    expect(view.totalCount).toBe(2);
    expect(view.isUnpopulated).toBe(false);
  });

  test('nests a worktree found on disk under its repository row without changing the total', () => {
    const view = buildRepositoriesView(
      params('', {
        discoveredWorktrees: mockDiscoveredWorktrees({
          worktrees: [
            mockDiscoveredWorktree({ name: 'wt-a', repositoryId: 'repo-1' }),
          ],
        }),
      }),
    );

    // Paging counts PARENT rows only.
    expect(view.totalCount).toBe(2);
    expect(view.rows[0]?.children?.map((child) => child.displayName)).toEqual([
      'openthrottle-worktree',
      'wt-a',
    ]);
  });

  describe('before the scan has resolved', () => {
    test('still lists every registered checkout, without on-disk state', () => {
      const view = buildRepositoriesView(
        params('', { discoveredWorktrees: null }),
      );

      expect(view.rows.map((row) => row.id)).toEqual([
        'checkout-1',
        'checkout-2',
      ]);
      expect(view.rows[0]?.children?.[0]?.activity).toBeNull();
    });
  });

  test('hides registered worktrees missing from disk unless showMissing is set', () => {
    const discoveredWorktrees = mockDiscoveredWorktrees({
      missingCheckouts: [mockMissingCheckout({ checkoutId: 'worktree-1' })],
    });

    const hidden = buildRepositoriesView(params('', { discoveredWorktrees }));
    const shown = buildRepositoriesView(
      params('showMissing=1', { discoveredWorktrees }),
    );

    expect(hidden.rows[0]?.children).toBeUndefined();
    expect(shown.showMissing).toBe(true);
    expect(shown.rows[0]?.children).toHaveLength(1);
  });

  test('reports an unpopulated workspace when nothing is registered', () => {
    const view = buildRepositoriesView(params('', { repositories: [] }));

    expect(view.isUnpopulated).toBe(true);
    expect(view.rows).toEqual([]);
    expect(view.totalCount).toBe(0);
  });

  test('filters by search and auto-expands a group matched only by a worktree', () => {
    const view = buildRepositoriesView(params('search=openthrottle-worktree'));

    expect(view.rows.map((row) => row.id)).toEqual(['checkout-1']);
    expect(view.autoExpandedIds).toEqual(['checkout-1']);
    expect(view.isUnpopulated).toBe(false);
    expect(view.totalCount).toBe(1);
  });

  test('applies sortBy and sortOrder, falling back to the defaults', () => {
    const sorted = buildRepositoriesView(params('sortBy=name&sortOrder=desc'));
    const fallback = buildRepositoriesView(
      params('sortBy=bogus&sortOrder=sideways'),
    );

    expect(sorted.rows.map((row) => row.repositoryName)).toEqual([
      'website',
      'OpenThrottle',
    ]);
    expect(fallback.sortBy).toBe('name');
    expect(fallback.sortOrder).toBe('asc');
  });

  test('pages over parent rows, keeping a group whole', () => {
    const pageOne = buildRepositoriesView(params('limit=1&page=1'));
    const pageTwo = buildRepositoriesView(params('limit=1&page=2'));

    expect(pageOne.rows.map((row) => row.id)).toEqual(['checkout-1']);
    expect(pageOne.rows[0]?.children).toHaveLength(1);
    expect(pageOne.totalCount).toBe(2);
    expect(pageTwo.rows.map((row) => row.id)).toEqual(['checkout-2']);
  });

  test('clamps limit and page to sane values', () => {
    const view = buildRepositoriesView(params('limit=9999&page=0'));

    expect(view.limit).toBe(100);
    expect(view.page).toBe(1);
  });
});
