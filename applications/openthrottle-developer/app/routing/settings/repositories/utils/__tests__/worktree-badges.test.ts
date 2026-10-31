import { describe, expect, test } from 'vitest';

import {
  MissingWorktreeCheckoutReason,
  WorktreeActivity,
} from '~/__generated__/graphql';
import { REPOSITORIES_TABLE_COPY } from '~/routing/settings/repositories/data/data.copy';
import {
  mockCheckout,
  mockDiscoveredWorktree,
  mockMissingCheckout,
  mockRepository,
} from '~/routing/settings/repositories/data/mock.repositories';

import { buildRepositoryRows } from '../rows';
import { deriveWorktreeBadges } from '../worktree-badges';

const rowFor = (
  worktree: Parameters<typeof mockDiscoveredWorktree>[0],
): ReturnType<typeof buildRepositoryRows>[number] => {
  const rows = buildRepositoryRows(
    [
      mockRepository({
        checkouts: [mockCheckout({ id: 'primary-1' })],
        id: 'repo-1',
      }),
    ],
    [mockDiscoveredWorktree(worktree)],
  );

  const child = rows[0]?.children?.[0];
  if (child === undefined) throw new Error('expected a worktree child row');
  return child;
};

describe('deriveWorktreeBadges', () => {
  test('badges a running worktree', () => {
    const badges = deriveWorktreeBadges(
      rowFor({ activity: WorktreeActivity.Running, name: 'wt-a' }),
    );

    expect(badges.map((badge) => badge.label)).toEqual([
      REPOSITORIES_TABLE_COPY.worktreeActivityRunning,
      REPOSITORIES_TABLE_COPY.unregisteredBadge,
    ]);
  });

  test('badges dirty and idle distinctly', () => {
    expect(
      deriveWorktreeBadges(
        rowFor({ activity: WorktreeActivity.Dirty, name: 'wt-a' }),
      )[0]?.label,
    ).toBe(REPOSITORIES_TABLE_COPY.worktreeActivityDirty);

    expect(
      deriveWorktreeBadges(
        rowFor({ activity: WorktreeActivity.Idle, name: 'wt-a' }),
      )[0]?.label,
    ).toBe(REPOSITORIES_TABLE_COPY.worktreeActivityIdle);
  });

  test('omits the unregistered badge for a registered worktree', () => {
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
      [
        mockDiscoveredWorktree({
          activity: WorktreeActivity.Idle,
          checkoutId: 'worktree-1',
          name: 'wt-a',
        }),
      ],
    );

    const childRow = rows[0]?.children?.[0];
    if (childRow === undefined) {
      throw new Error('expected a worktree child row');
    }

    const badges = deriveWorktreeBadges(childRow);

    expect(badges.map((badge) => badge.label)).toEqual([
      REPOSITORIES_TABLE_COPY.worktreeActivityIdle,
    ]);
  });

  test('returns no badges for a row the scan never saw', () => {
    const rows = buildRepositoryRows([
      mockRepository({
        checkouts: [mockCheckout({ id: 'primary-1' })],
        id: 'repo-1',
      }),
    ]);

    // No activity means "not observed on disk", which must NOT render as Idle.
    const parentRow = rows[0];
    if (parentRow === undefined) {
      throw new Error('expected a parent row');
    }

    expect(deriveWorktreeBadges(parentRow)).toEqual([]);
  });

  test('every badge carries explanatory hover text', () => {
    const badges = deriveWorktreeBadges(
      rowFor({ activity: WorktreeActivity.Dirty, name: 'wt-a' }),
    );

    expect(badges).toHaveLength(2);
    expect(badges.every((badge) => badge.title.length > 0)).toBe(true);
  });

  describe('a registered worktree missing from disk', () => {
    const missingRow = (
      reason: Parameters<typeof mockMissingCheckout>[0],
    ): ReturnType<typeof buildRepositoryRows>[number] => {
      const child = buildRepositoryRows(
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
        [mockMissingCheckout(reason)],
      )[0]?.children?.[0];
      if (child === undefined) throw new Error('expected a worktree child row');
      return child;
    };

    test('gets a missing badge in the missing tone', () => {
      const badges = deriveWorktreeBadges(missingRow({}));

      expect(badges).toEqual([
        expect.objectContaining({
          id: 'missing',
          label: REPOSITORIES_TABLE_COPY.missingBadge,
          tone: 'missing',
        }),
      ]);
    });

    test('explains a gone path and a leftover folder differently', () => {
      const gone = deriveWorktreeBadges(missingRow({}))[0];
      const husk = deriveWorktreeBadges(
        missingRow({ reason: MissingWorktreeCheckoutReason.NotAWorktree }),
      )[0];

      expect(gone?.title).toBe(
        REPOSITORIES_TABLE_COPY.missingBadgeTitlePathGone,
      );
      expect(husk?.title).toBe(
        REPOSITORIES_TABLE_COPY.missingBadgeTitleNotAWorktree,
      );
    });
  });
});
