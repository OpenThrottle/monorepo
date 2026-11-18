/**
 * @description Unit tests for the discoveredWorktrees resolver: the classified payload maps
 * straight through, warnings and the cap overflow reach the client, an unconfigured or
 * unresolvable root renders as an empty list rather than an error, `refresh` bypasses the cached
 * scan, and the mutations drop it. `safeToRemove` lives in DiscoveredWorktreeResolver.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { RepositoryCheckout } from '@openthrottle/nestjs-repositories';
import type { RepositoryCheckoutsRepository } from '@openthrottle/nestjs-repositories-server';
import type {
  WorktreeRemoval,
  WorktreeRemovalsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { createRepositoryCheckoutsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { createWorktreeRemovalsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it, vi } from 'vitest';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import type { PlanRunWorktreeTeardownService } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import { WORKTREE_ACTIVITY } from '../../../services/worktree-activity/worktree-activity.constants.ts';
import type { WorktreeActivityService } from '../../../services/worktree-activity/worktree-activity.service.ts';
import type { WorktreeActivityResult } from '../../../services/worktree-activity/worktree-activity.types.ts';
import { PRUNE_WORKTREE_CHECKOUT_OUTCOME } from '../../../services/worktree-checkout-prune/worktree-checkout-prune.constants.ts';
import type { WorktreeCheckoutPruneService } from '../../../services/worktree-checkout-prune/worktree-checkout-prune.service.ts';
import {
  MISSING_CHECKOUT_REASON,
  WORKTREE_DISCOVERY_SOURCE,
} from '../../../services/worktree-discovery/worktree-discovery.constants.ts';
import { DiscoveredWorktreesResolver } from './discovered-worktrees.resolver.ts';

const ROOT = '/Users/matt/Development/openthrottle-worktrees';

const build = (
  result: WorktreeActivityResult,
  discoverAndClassify = vi.fn().mockResolvedValue(result),
  findLatestByUserAndPaths = vi.fn().mockResolvedValue([]),
): DiscoveredWorktreesResolver => {
  const removals = createWorktreeRemovalsRepositoryMock();
  removals.findLatestByUserAndPaths.mockImplementation(
    findLatestByUserAndPaths,
  );

  return new DiscoveredWorktreesResolver(
    createMock<WorktreeActivityService>({ discoverAndClassify }),
    asMock<RepositoryCheckoutsRepository>(
      createRepositoryCheckoutsRepositoryMock(),
    ),
    createMock<WorktreeCheckoutPruneService>(),
    createMock<PlanRunWorktreeTeardownService>(),
    createMock<WorktreeRemovalsRepository>(removals),
  );
};

const EMPTY: WorktreeActivityResult = {
  droppedCount: 0,
  missingCheckouts: [],
  problems: [],
  rootSource: 'default',
  scannedAt: '2026-08-24T00:00:00.000Z',
  scannedRoots: [],
  warnings: [],
  worktreeRoot: ROOT,
  worktrees: [],
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
          // Not GraphQL fields: carried for the safeToRemove field resolver.
          commonDir: '/Users/matt/Development/openthrottle/.git',
          dirty: true,
          name: 'wt-a',
          path: `${ROOT}/wt-a`,
          planId: 'plan-1',
          planRunId: 'run-1',
          repositoryId: 'repo-1',
          // Carried through to the client so "Running" can be shown as a claim rather
          // than a verified fact when the run does not heartbeat.
          runMonitored: false,
          unregistered: false,
        },
      ],
    });
  });

  describe('refresh', () => {
    it('reuses the cached scan on a routine load', async () => {
      const discoverAndClassify = vi.fn().mockResolvedValue(EMPTY);

      await build(EMPTY, discoverAndClassify).discoveredWorktrees('user-1');

      expect(discoverAndClassify).toHaveBeenCalledWith('user-1', {
        fresh: false,
      });
    });

    it('asks for a fresh scan when the client requests a refresh', async () => {
      const discoverAndClassify = vi.fn().mockResolvedValue(EMPTY);

      await build(EMPTY, discoverAndClassify).discoveredWorktrees(
        'user-1',
        true,
      );

      expect(discoverAndClassify).toHaveBeenCalledWith('user-1', {
        fresh: true,
      });
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

    expect(payload.missingCheckouts).toEqual([
      { ...missing, lastRemoval: null },
    ]);
  });

  describe('when a removal was reported for a missing checkout', () => {
    const missing = {
      checkoutId: 'checkout-gone',
      path: `${ROOT}/wt-gone`,
      reason: MISSING_CHECKOUT_REASON.PATH_GONE,
      repositoryId: 'repo-1',
    };
    const scan: WorktreeActivityResult = {
      ...EMPTY,
      missingCheckouts: [missing],
    };
    const removal = createMock<WorktreeRemoval>({
      agentSession: 'session-1',
      ancestry: '10 claude',
      branch: 'feat/x',
      createdAt: new Date('2026-11-15T17:00:05Z'),
      filesystemPath: missing.path,
      id: 'removal-1',
      outcome: PRUNE_WORKTREE_CHECKOUT_OUTCOME.SKIPPED_ACTIVE_RUN,
      parentCommand: 'pnpm worktree:remove wt-gone',
      removedAt: new Date('2026-11-15T17:00:00Z'),
      result: 'removed',
    });

    it('attaches it as lastRemoval, looked up by the missing paths', async () => {
      const findLatestByUserAndPaths = vi.fn().mockResolvedValue([removal]);
      const resolver = build(scan, undefined, findLatestByUserAndPaths);

      const payload = await resolver.discoveredWorktrees('user-1');

      expect(findLatestByUserAndPaths).toHaveBeenCalledWith('user-1', [
        missing.path,
      ]);
      expect(payload.missingCheckouts[0]?.lastRemoval).toEqual({
        agentSession: 'session-1',
        ancestry: '10 claude',
        branch: 'feat/x',
        createdAt: new Date('2026-11-15T17:00:05Z'),
        id: 'removal-1',
        outcome: 'skipped-active-run',
        parentCommand: 'pnpm worktree:remove wt-gone',
        removedAt: new Date('2026-11-15T17:00:00Z'),
        result: 'removed',
      });
    });

    it('reads as no removal when the lookup fails', async () => {
      const findLatestByUserAndPaths = vi
        .fn()
        .mockRejectedValue(new Error('db down'));
      const resolver = build(scan, undefined, findLatestByUserAndPaths);

      const payload = await resolver.discoveredWorktrees('user-1');

      expect(payload.missingCheckouts[0]?.lastRemoval).toBeNull();
    });
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
      const invalidate = vi.fn();
      const resolver = new DiscoveredWorktreesResolver(
        createMock<WorktreeActivityService>({ invalidate }),
        asMock<RepositoryCheckoutsRepository>(
          createRepositoryCheckoutsRepositoryMock(),
        ),
        createMock<WorktreeCheckoutPruneService>({ pruneByIds }),
        createMock<PlanRunWorktreeTeardownService>(),
        createMock<WorktreeRemovalsRepository>(
          createWorktreeRemovalsRepositoryMock(),
        ),
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
      expect(invalidate).toHaveBeenCalledWith('user-1');
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
      readonly invalidate: ReturnType<typeof vi.fn>;
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
      const invalidate = vi.fn();
      const resolver = new DiscoveredWorktreesResolver(
        createMock<WorktreeActivityService>({ invalidate }),
        asMock<RepositoryCheckoutsRepository>({
          ...createRepositoryCheckoutsRepositoryMock(),
          findByIdForUser: vi.fn().mockResolvedValue(options.checkout),
        }),
        createMock<WorktreeCheckoutPruneService>(),
        createMock<PlanRunWorktreeTeardownService>({
          resolveBaseCheckoutPath: vi.fn().mockResolvedValue('/repo'),
          teardown,
        }),
        createMock<WorktreeRemovalsRepository>(
          createWorktreeRemovalsRepositoryMock(),
        ),
      );
      return { invalidate, resolver, teardown };
    };

    const checkout = createMock<RepositoryCheckout>({
      filesystemPath: PATH,
      id: 'checkout-plan',
      kind: 'worktree',
    });

    it('tears the worktree down from its primary checkout and reports the kept branch', async () => {
      const { invalidate, resolver, teardown } = buildForRemoval({
        checkout,
      });

      const payload = await resolver.removePlanRunWorktree(
        'user-1',
        'checkout-plan',
      );

      expect(invalidate).toHaveBeenCalledWith('user-1');
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
