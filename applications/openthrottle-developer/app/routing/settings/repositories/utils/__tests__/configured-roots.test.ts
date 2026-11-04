import { describe, expect, test } from 'vitest';

import { WorktreeRootSource } from '~/__generated__/graphql';
import { WORKTREE_DISCOVERY_COPY } from '~/routing/settings/repositories/data/data.copy';
import { mockScannedRoot } from '~/routing/settings/repositories/data/mock.repositories';

import { configuredRoots } from '../configured-roots';

describe('configuredRoots', () => {
  test('returns nothing when no root was scanned', () => {
    expect(configuredRoots([])).toEqual([]);
  });

  test('collapses repositories that share a configured root into one entry', () => {
    expect(
      configuredRoots([
        mockScannedRoot({ path: '/Users/dev/.openthrottle/worktrees/a/one' }),
        mockScannedRoot({ path: '/Users/dev/.openthrottle/worktrees/b/two' }),
      ]),
    ).toEqual([
      {
        baseRoot: '/Users/dev/.openthrottle/worktrees',
        sourceLabel: WORKTREE_DISCOVERY_COPY.sourceLabelDefault,
      },
    ]);
  });

  test('keeps distinct roots in scan order', () => {
    expect(
      configuredRoots([
        mockScannedRoot({
          baseRoot: '/srv/b',
          source: WorktreeRootSource.CheckoutEnv,
        }),
        mockScannedRoot({ baseRoot: '/srv/a', source: WorktreeRootSource.Env }),
      ]).map((root) => root.baseRoot),
    ).toEqual(['/srv/b', '/srv/a']);
  });

  test('keeps every source of a root reached through more than one rung', () => {
    const [root] = configuredRoots([
      mockScannedRoot({ source: WorktreeRootSource.CheckoutEnv }),
      mockScannedRoot({ source: WorktreeRootSource.Default }),
      mockScannedRoot({ source: WorktreeRootSource.CheckoutEnv }),
    ]);

    expect(root?.sourceLabel).toBe(
      `${WORKTREE_DISCOVERY_COPY.sourceLabelCheckoutEnv}, ${WORKTREE_DISCOVERY_COPY.sourceLabelDefault}`,
    );
  });

  test.each([
    [
      WorktreeRootSource.CheckoutEnv,
      WORKTREE_DISCOVERY_COPY.sourceLabelCheckoutEnv,
    ],
    [WorktreeRootSource.Default, WORKTREE_DISCOVERY_COPY.sourceLabelDefault],
    [WorktreeRootSource.Env, WORKTREE_DISCOVERY_COPY.sourceLabelEnv],
  ])('labels the %s rung', (source, label) => {
    expect(configuredRoots([mockScannedRoot({ source })])[0]?.sourceLabel).toBe(
      label,
    );
  });
});
