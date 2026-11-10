/**
 * @description Unit tests for the lazily resolved `safeToRemove` field: true only when every
 * teardown guard passes for a registered plan-run worktree, and answered WITHOUT assessing whenever
 * the worktree is already known not to qualify — that skipped work is the point of moving it here.
 */

import { createMock } from '@golevelup/ts-vitest';
import { describe, expect, it, vi } from 'vitest';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import type { PlanRunWorktreeTeardownService } from '../../../services/plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import type { WorktreeActivityService } from '../../../services/worktree-activity/worktree-activity.service.ts';
import type { DiscoveredWorktreeObject } from '../discovered-worktrees.object.ts';
import { WorktreeActivityEnum } from '../discovered-worktrees.object.ts';
import { DiscoveredWorktreeResolver } from './discovered-worktree.resolver.ts';

const ROOT = '/Users/matt/.openthrottle/worktrees/OpenThrottle/monorepo';
const PATH = `${ROOT}/plan-c34e018b`;

const planRunWorktree = (
  overrides: Partial<DiscoveredWorktreeObject> = {},
): DiscoveredWorktreeObject => {
  return {
    activity: WorktreeActivityEnum.IDLE,
    branch: 'openthrottle/plan-c34e018b',
    checkoutId: 'checkout-plan',
    commonDir: '/Users/matt/Development/openthrottle/.git',
    dirty: false,
    name: 'plan-c34e018b',
    path: PATH,
    planId: null,
    planRunId: null,
    repositoryId: 'repo-1',
    runMonitored: null,
    unregistered: false,
    ...overrides,
  };
};

const USER = 'user-1';

/** A memo that never caches, so each test sees the computation itself. */
const passthroughMemo = vi.fn(
  (_userId: string, _key: string, compute: () => Promise<boolean>) => {
    return compute();
  },
);

const build = (
  assess: PlanRunWorktreeTeardownService['assess'],
  memoizeVerdict: WorktreeActivityService['memoizeVerdict'] = passthroughMemo,
): DiscoveredWorktreeResolver => {
  return new DiscoveredWorktreeResolver(
    createMock<WorktreeActivityService>({ memoizeVerdict }),
    createMock<PlanRunWorktreeTeardownService>({ assess }),
  );
};

describe('DiscoveredWorktreeResolver', () => {
  describe('safeToRemove', () => {
    it("memoizes the assessment against the caller's cached scan, keyed by path", async () => {
      const assess = vi.fn();
      const memoizeVerdict = vi.fn().mockResolvedValue(true);

      await expect(
        build(assess, memoizeVerdict).safeToRemove(USER, planRunWorktree()),
      ).resolves.toBe(true);
      expect(memoizeVerdict).toHaveBeenCalledWith(
        USER,
        `safeToRemove:${PATH}`,
        expect.any(Function),
      );
      // The memo answered, so the teardown guards never ran.
      expect(assess).not.toHaveBeenCalled();
    });

    it('is true for a registered plan-run worktree every guard passes', async () => {
      const assess = vi.fn().mockResolvedValue({
        branch: null,
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVABLE,
        worktreePath: PATH,
      });

      await expect(
        build(assess).safeToRemove(USER, planRunWorktree()),
      ).resolves.toBe(true);
      expect(assess).toHaveBeenCalledWith({
        baseCheckoutPath: '/Users/matt/Development/openthrottle',
        worktreePath: PATH,
      });
    });

    it('is false when a guard keeps it', async () => {
      const assess = vi.fn().mockResolvedValue({
        detail: 'it has commits that are not pushed',
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_UNPUSHED,
        worktreePath: PATH,
      });

      await expect(
        build(assess).safeToRemove(USER, planRunWorktree()),
      ).resolves.toBe(false);
    });

    describe('answers without assessing', () => {
      it('for an unregistered worktree', async () => {
        const assess = vi.fn();

        await expect(
          build(assess).safeToRemove(
            USER,
            planRunWorktree({ checkoutId: null, unregistered: true }),
          ),
        ).resolves.toBe(false);
        expect(assess).not.toHaveBeenCalled();
      });

      it('for a worktree the server did not provision', async () => {
        const assess = vi.fn();

        await expect(
          build(assess).safeToRemove(
            USER,
            planRunWorktree({ name: 'wt-a', path: `${ROOT}/wt-a` }),
          ),
        ).resolves.toBe(false);
        expect(assess).not.toHaveBeenCalled();
      });

      it('for a worktree discovery already saw dirty', async () => {
        const assess = vi.fn();

        await expect(
          build(assess).safeToRemove(USER, planRunWorktree({ dirty: true })),
        ).resolves.toBe(false);
        expect(assess).not.toHaveBeenCalled();
      });

      it('for a worktree whose primary checkout is unknown', async () => {
        const assess = vi.fn();

        await expect(
          build(assess).safeToRemove(
            USER,
            planRunWorktree({ commonDir: null }),
          ),
        ).resolves.toBe(false);
        expect(assess).not.toHaveBeenCalled();
      });
    });

    it('still assesses when discovery could not read git status', async () => {
      const assess = vi.fn().mockResolvedValue({
        detail: 'git status failed',
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.FAILED,
        worktreePath: PATH,
      });

      await expect(
        build(assess).safeToRemove(USER, planRunWorktree({ dirty: null })),
      ).resolves.toBe(false);
      expect(assess).toHaveBeenCalledTimes(1);
    });
  });
});
