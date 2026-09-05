/**
 * @description Unit tests for the discoveredWorktrees resolver: the classified payload maps
 * straight through, warnings and the cap overflow reach the client, and an unconfigured or
 * unresolvable root renders as an empty list rather than an error.
 */

import { describe, expect, it, vi } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';
import type { WorktreeActivityService } from '../../services/worktree-activity/worktree-activity.service';
import type { WorktreeActivityResult } from '../../services/worktree-activity/worktree-activity.types';
import { WORKTREE_ACTIVITY } from '../../services/worktree-activity/worktree-activity.types';
import { WORKTREE_DISCOVERY_SOURCE } from '../../services/worktree-discovery/worktree-discovery.types';
import { DiscoveredWorktreesResolver } from './discovered-worktrees.resolver';

const ROOT = '/Users/matt/Development/openthrottle-worktrees';

const build = (result: WorktreeActivityResult): DiscoveredWorktreesResolver =>
  new DiscoveredWorktreesResolver(
    createMock<WorktreeActivityService>({
      discoverAndClassify: vi.fn().mockResolvedValue(result),
    }),
  );

describe('DiscoveredWorktreesResolver', () => {
  it('maps a classified worktree onto the GraphQL object', async () => {
    const resolver = build({
      droppedCount: 0,
      problems: [],
      rootSource: 'env',
      scannedAt: '2026-08-24T00:00:00.000Z',
      scannedRoots: [],
      warnings: [],
      worktreeRoot: ROOT,
      worktrees: [
        {
          activity: WORKTREE_ACTIVITY.RUNNING,
          aheadCount: 1,
          branch: 'openthrottle/wt-a',
          checkoutId: 'checkout-wt-a',
          commonDir: '/Users/matt/Development/openthrottle/.git',
          dirty: true,
          name: 'wt-a',
          path: `${ROOT}/wt-a`,
          planId: 'plan-1',
          planRunId: 'run-1',
          repositoryId: 'repo-1',
          sources: [WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST],
          unregistered: false,
        },
      ],
    });

    const payload = await resolver.discoveredWorktrees('user-1');

    expect(payload).toEqual({
      droppedCount: 0,
      problems: [],
      rootSource: 'env',
      scannedAt: '2026-08-24T00:00:00.000Z',
      scannedRoots: [],
      warnings: [],
      worktreeRoot: ROOT,
      worktrees: [
        {
          activity: 'RUNNING',
          branch: 'openthrottle/wt-a',
          checkoutId: 'checkout-wt-a',
          name: 'wt-a',
          path: `${ROOT}/wt-a`,
          planId: 'plan-1',
          planRunId: 'run-1',
          repositoryId: 'repo-1',
          unregistered: false,
        },
      ],
    });
  });

  it('passes warnings and the cap overflow through to the client', async () => {
    const resolver = build({
      droppedCount: 7,
      problems: [],
      rootSource: 'default',
      scannedAt: '2026-08-24T00:00:00.000Z',
      scannedRoots: [],
      warnings: ['worktree root /nope could not be read'],
      worktreeRoot: ROOT,
      worktrees: [],
    });

    const payload = await resolver.discoveredWorktrees('user-1');

    expect(payload.droppedCount).toBe(7);
    expect(payload.warnings).toEqual(['worktree root /nope could not be read']);
  });

  it('renders an empty list when no root could be resolved', async () => {
    const resolver = build({
      droppedCount: 0,
      problems: [],
      rootSource: null,
      scannedAt: '2026-08-24T00:00:00.000Z',
      scannedRoots: [],
      warnings: [],
      worktreeRoot: null,
      worktrees: [],
    });

    const payload = await resolver.discoveredWorktrees('user-1');

    expect(payload).toMatchObject({
      rootSource: null,
      worktreeRoot: null,
      worktrees: [],
    });
  });
});
