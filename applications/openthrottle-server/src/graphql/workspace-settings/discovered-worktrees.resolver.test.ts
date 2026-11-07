/**
 * @description Unit tests for the discoveredWorktrees resolver: the classified payload maps
 * straight through, warnings and the cap overflow reach the client, and an unconfigured or
 * unresolvable root renders as an empty list rather than an error.
 */

import { createMock } from '@golevelup/ts-vitest';
import type {
  RepositoryCheckout,
  RepositoryCheckoutsService,
} from '@openthrottle/nestjs-repositories';
import { describe, expect, it, vi } from 'vitest';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import type { PlanRunWorktreeTeardownService } from '../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import type { WorktreeActivityService } from '../../services/worktree-activity/worktree-activity.service.ts';
import type { WorktreeActivityResult } from '../../services/worktree-activity/worktree-activity.types.ts';
import { WORKTREE_ACTIVITY } from '../../services/worktree-activity/worktree-activity.types.ts';
import type { WorktreeCheckoutPruneService } from '../../services/worktree-checkout-prune/worktree-checkout-prune.service.ts';
import { PRUNE_WORKTREE_CHECKOUT_OUTCOME } from '../../services/worktree-checkout-prune/worktree-checkout-prune.types.ts';
import {
  MISSING_CHECKOUT_REASON,
  WORKTREE_DISCOVERY_SOURCE,
} from '../../services/worktree-discovery/worktree-discovery.types.ts';
import { DiscoveredWorktreesResolver } from './discovered-worktrees.resolver.ts';

const ROOT = '/Users/matt/Development/openthrottle-worktrees';

const build = (
  result: WorktreeActivityResult,
  assess = vi.fn().mockResolvedValue({
    branch: null,
    outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE,
    worktreePath: '',
  }),
): DiscoveredWorktreesResolver => {
  return new DiscoveredWorktreesResolver(
    createMock<WorktreeActivityService>({
      discoverAndClassify: vi.fn().mockResolvedValue(result),
    }),
    createMock<RepositoryCheckoutsService>(),
    createMock<WorktreeCheckoutPruneService>(),
    createMock<PlanRunWorktreeTeardownService>({ assess }),
  );
};

describe('DiscoveredWorktreesResolver', () => {
  it('maps a classified worktree onto the GraphQL object', async () => {
    const resolver = build({
      droppedCount: 0,
      missingCheckouts: [],
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
          runMonitored: false,
          sources: [WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST],
          unregistered: false,
        },
      ],
    });

    const payload = await resolver.discoveredWorktrees('user-1');

    expect(payload).toEqual({
      droppedCount: 0,
      missingCheckouts: [],
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
          // Carried through to the client so "Running" can be shown as a claim rather
          // than a verified fact when the run does not heartbeat.
          runMonitored: false,
          // Not a plan-<8> worktree, so never offered for removal.
          safeToRemove: false,
          unregistered: false,
        },
      ],
    });
  });

  describe('safeToRemove', () => {
    const planRunWorktree = (
      overrides: Partial<WorktreeActivityResult['worktrees'][number]> = {},
    ): WorktreeActivityResult => {
      return {
        droppedCount: 0,
        missingCheckouts: [],
        problems: [],
        rootSource: 'default',
        scannedAt: '2026-08-24T00:00:00.000Z',
        scannedRoots: [],
        warnings: [],
        worktreeRoot: ROOT,
        worktrees: [
          {
            activity: WORKTREE_ACTIVITY.IDLE,
            aheadCount: 0,
            branch: 'openthrottle/plan-c34e018b',
            checkoutId: 'checkout-plan',
            commonDir: '/Users/matt/Development/openthrottle/.git',
            dirty: false,
            name: 'plan-c34e018b',
            path: `${ROOT}/plan-c34e018b`,
            planId: null,
            planRunId: null,
            repositoryId: 'repo-1',
            runMonitored: null,
            sources: [WORKTREE_DISCOVERY_SOURCE.GIT_WORKTREE_LIST],
            unregistered: false,
            ...overrides,
          },
        ],
      };
    };

    it('is true for a registered plan-run worktree every guard passes', async () => {
      const assess = vi.fn().mockResolvedValue({
        branch: null,
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE,
        worktreePath: `${ROOT}/plan-c34e018b`,
      });

      const payload = await build(
        planRunWorktree(),
        assess,
      ).discoveredWorktrees('user-1');

      expect(payload.worktrees[0]?.safeToRemove).toBe(true);
      expect(assess).toHaveBeenCalledWith({
        baseCheckoutPath: '/Users/matt/Development/openthrottle',
        worktreePath: `${ROOT}/plan-c34e018b`,
      });
    });

    it('is false when a guard keeps it', async () => {
      const assess = vi.fn().mockResolvedValue({
        detail: 'it has uncommitted changes',
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
        worktreePath: `${ROOT}/plan-c34e018b`,
      });

      const payload = await build(
        planRunWorktree(),
        assess,
      ).discoveredWorktrees('user-1');

      expect(payload.worktrees[0]?.safeToRemove).toBe(false);
    });

    it('is false, without assessing, for an unregistered worktree', async () => {
      const assess = vi.fn();

      const payload = await build(
        planRunWorktree({ checkoutId: null, unregistered: true }),
        assess,
      ).discoveredWorktrees('user-1');

      expect(payload.worktrees[0]?.safeToRemove).toBe(false);
      expect(assess).not.toHaveBeenCalled();
    });
  });

  it('passes warnings and the cap overflow through to the client', async () => {
    const resolver = build({
      droppedCount: 7,
      missingCheckouts: [],
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

  it('passes registered checkouts that are missing on disk through to the client', async () => {
    const missing = {
      checkoutId: 'checkout-gone',
      path: `${ROOT}/wt-gone`,
      reason: MISSING_CHECKOUT_REASON.PATH_GONE,
      repositoryId: 'repo-1',
    };
    const resolver = build({
      droppedCount: 0,
      missingCheckouts: [missing],
      problems: [],
      rootSource: 'default',
      scannedAt: '2026-08-24T00:00:00.000Z',
      scannedRoots: [],
      warnings: [],
      worktreeRoot: ROOT,
      worktrees: [],
    });

    const payload = await resolver.discoveredWorktrees('user-1');

    expect(payload.missingCheckouts).toEqual([missing]);
  });

  it('renders an empty list when no root could be resolved', async () => {
    const resolver = build({
      droppedCount: 0,
      missingCheckouts: [],
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

  describe('pruneWorktreeCheckouts', () => {
    it('hands the requested ids and the caller to the service and maps every outcome', async () => {
      const pruneByIds = vi.fn().mockResolvedValue([
        {
          checkoutId: 'checkout-gone',
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.PRUNED,
          path: `${ROOT}/wt-gone`,
        },
        {
          checkoutId: 'checkout-nope',
          outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.NOT_FOUND,
          path: null,
        },
      ]);
      const resolver = new DiscoveredWorktreesResolver(
        createMock<WorktreeActivityService>(),
        createMock<RepositoryCheckoutsService>(),
        createMock<WorktreeCheckoutPruneService>({ pruneByIds }),
        createMock<PlanRunWorktreeTeardownService>(),
      );

      const payload = await resolver.pruneWorktreeCheckouts('user-1', {
        checkoutIds: ['checkout-gone', 'checkout-nope'],
      });

      expect(pruneByIds).toHaveBeenCalledWith('user-1', [
        'checkout-gone',
        'checkout-nope',
      ]);
      expect(payload.results).toEqual([
        {
          checkoutId: 'checkout-gone',
          outcome: 'pruned',
          path: `${ROOT}/wt-gone`,
        },
        { checkoutId: 'checkout-nope', outcome: 'not-found', path: null },
      ]);
    });
  });

  describe('removePlanRunWorktree', () => {
    const PATH = `${ROOT}/plan-c34e018b`;

    type TeardownMock = ReturnType<
      typeof vi.fn<PlanRunWorktreeTeardownService['teardown']>
    >;

    const buildForRemoval = (options: {
      readonly checkout: RepositoryCheckout | null;
      readonly teardown?: TeardownMock;
    }): {
      readonly resolver: DiscoveredWorktreesResolver;
      readonly teardown: TeardownMock;
    } => {
      const teardown =
        options.teardown ??
        vi.fn<PlanRunWorktreeTeardownService['teardown']>().mockResolvedValue({
          branch: 'openthrottle/plan-c34e018b',
          outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
          worktreePath: PATH,
        });
      const resolver = new DiscoveredWorktreesResolver(
        createMock<WorktreeActivityService>(),
        createMock<RepositoryCheckoutsService>({
          findByIdForUser: vi.fn().mockResolvedValue(options.checkout),
        }),
        createMock<WorktreeCheckoutPruneService>(),
        createMock<PlanRunWorktreeTeardownService>({
          resolveBaseCheckoutPath: vi.fn().mockResolvedValue('/repo'),
          teardown,
        }),
      );
      return { resolver, teardown };
    };

    const checkout = createMock<RepositoryCheckout>({
      filesystemPath: PATH,
      id: 'checkout-plan',
      kind: 'worktree',
    });

    it('tears the worktree down from its primary checkout and reports the kept branch', async () => {
      const { resolver, teardown } = buildForRemoval({ checkout });

      const payload = await resolver.removePlanRunWorktree(
        'user-1',
        'checkout-plan',
      );

      expect(teardown).toHaveBeenCalledWith({
        baseCheckoutPath: '/repo',
        worktreePath: PATH,
      });
      expect(payload).toEqual({
        branch: 'openthrottle/plan-c34e018b',
        checkoutId: 'checkout-plan',
        detail: null,
        outcome: 'removed',
        path: PATH,
      });
    });

    it('reports why a guard kept the worktree', async () => {
      const { resolver } = buildForRemoval({
        checkout,
        teardown: vi
          .fn<PlanRunWorktreeTeardownService['teardown']>()
          .mockResolvedValue({
            detail: 'it has uncommitted changes',
            outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
            worktreePath: PATH,
          }),
      });

      const payload = await resolver.removePlanRunWorktree(
        'user-1',
        'checkout-plan',
      );

      expect(payload).toMatchObject({
        branch: null,
        detail: 'it has uncommitted changes',
        outcome: 'kept-dirty',
      });
    });

    it('rejects a checkout the caller does not own', async () => {
      const { resolver, teardown } = buildForRemoval({ checkout: null });

      await expect(
        resolver.removePlanRunWorktree('user-1', 'checkout-other'),
      ).rejects.toThrow(/No checkout/);
      expect(teardown).not.toHaveBeenCalled();
    });
  });
});
