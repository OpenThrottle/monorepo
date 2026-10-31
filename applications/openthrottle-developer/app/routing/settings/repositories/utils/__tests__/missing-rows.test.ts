import { describe, expect, test } from 'vitest';

import {
  mockCheckout,
  mockDiscoveredWorktree,
  mockMissingCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';

import { hideMissingRows } from '../missing-rows';
import { buildRepositoryRows } from '../rows';

describe('hideMissingRows', () => {
  describe('when a primary carries a missing worktree', () => {
    test('drops only the missing child', () => {
      const rows = buildRepositoryRows(
        [
          mockRepository({
            checkouts: [
              mockCheckout({ id: 'primary-1' }),
              mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
              mockCheckout({ id: 'worktree-2', kind: 'worktree' }),
            ],
            id: 'repo-1',
          }),
        ],
        [],
        [],
        [mockMissingCheckout({ checkoutId: 'worktree-1' })],
      );

      const visible = hideMissingRows(rows);

      expect(visible.map((row) => row.id)).toEqual(['primary-1']);
      expect(visible[0]?.children?.map((child) => child.id)).toEqual([
        'worktree-2',
      ]);
    });

    test('leaves children undefined when the only worktree was missing', () => {
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
        [],
        [],
        [mockMissingCheckout({ checkoutId: 'worktree-1' })],
      );

      expect(hideMissingRows(rows)[0]?.children).toBeUndefined();
    });
  });

  describe('when a promoted parent is the missing one', () => {
    test('promotes its first live sibling instead of dropping the group', () => {
      const rows = buildRepositoryRows(
        [
          mockRepository({
            checkouts: [
              mockCheckout({ id: 'worktree-1', kind: 'worktree' }),
              mockCheckout({ id: 'worktree-2', kind: 'worktree' }),
            ],
            id: 'repo-1',
          }),
        ],
        [mockDiscoveredWorktree({ name: 'wt-unregistered' })],
        [],
        [mockMissingCheckout({ checkoutId: 'worktree-1' })],
      );

      const visible = hideMissingRows(rows);

      expect(visible.map((row) => row.id)).toEqual(['worktree-2']);
      expect(visible[0]?.children?.map((child) => child.displayName)).toEqual([
        'wt-unregistered',
      ]);
    });

    test('drops the group when nothing in it is live', () => {
      const rows = buildRepositoryRows(
        [
          mockRepository({
            checkouts: [mockCheckout({ id: 'worktree-1', kind: 'worktree' })],
            id: 'repo-1',
          }),
        ],
        [],
        [],
        [mockMissingCheckout({ checkoutId: 'worktree-1' })],
      );

      expect(hideMissingRows(rows)).toEqual([]);
    });
  });

  describe('when nothing is missing', () => {
    test('returns the same rows', () => {
      const rows = buildRepositoryRows([
        mockRepository({
          checkouts: [mockCheckout({ id: 'primary-1' })],
          id: 'repo-1',
        }),
      ]);

      expect(hideMissingRows(rows)).toEqual(rows);
    });
  });
});
