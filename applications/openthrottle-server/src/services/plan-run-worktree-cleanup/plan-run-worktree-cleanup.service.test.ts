/**
 * @description Unit tests for the after-run worktree policy: which runs get a teardown attempt, the
 * plan's keep switch, and the single plan_output line each outcome writes.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  PlanOutputStreamRepository,
  PlansRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlanOutputStreamRepositoryMock,
  createPlansRepositoryMock,
  planOutputStreamFactory,
  plansFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.constants.ts';
import type { PlanRunWorktreeTeardownService } from '../plan-run-worktree-teardown/plan-run-worktree-teardown.service.ts';
import { PLAN_RUN_WORKTREE_CLEANUP_SKIP } from './plan-run-worktree-cleanup.constants.ts';
import { PlanRunWorktreeCleanupService } from './plan-run-worktree-cleanup.service.ts';

const PLAN_ID = 'c34e018b-0000-4000-8000-000000000000';
const WORKTREE = {
  baseCheckoutPath: '/repo',
  worktreePath: '/root/acme/monorepo/plan-c34e018b',
};

const planWith = (worktreeCleanup: 'keep' | 'on-pr'): Plan => {
  const defaults = getDefaultPlanRunConfigStorage({ planId: PLAN_ID });
  return plansFactory.build({
    id: PLAN_ID,
    runConfig: { ...defaults, run: { ...defaults.run, worktreeCleanup } },
  });
};

const build = (options: {
  readonly plan: Plan | null | Error;
}): {
  readonly saved: string[];
  readonly service: PlanRunWorktreeCleanupService;
  readonly teardown: ReturnType<typeof vi.fn>;
} => {
  const saved: string[] = [];
  const teardown = vi.fn().mockResolvedValue({
    branch: 'openthrottle/plan-c34e018b',
    outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.REMOVED,
    worktreePath: WORKTREE.worktreePath,
  });
  const plansRepository = createPlansRepositoryMock();
  if (options.plan instanceof Error) {
    plansRepository.findOne.mockRejectedValue(options.plan);
  } else {
    plansRepository.findOne.mockResolvedValue(options.plan);
  }
  const planOutputStreamRepository = createPlanOutputStreamRepositoryMock();
  planOutputStreamRepository.create.mockImplementation(async (input) => {
    saved.push(input.content);

    return planOutputStreamFactory.build(input);
  });

  const service = new PlanRunWorktreeCleanupService(
    createMock<LoggerService>(),
    asMock<PlanOutputStreamRepository>(planOutputStreamRepository),
    asMock<PlansRepository>(plansRepository),
    createMock<PlanRunWorktreeTeardownService>({ teardown }),
  );
  return { saved, service, teardown };
};

const finished = {
  planId: PLAN_ID,
  prNumber: 42,
  reason: 'workflow_complete',
  worktree: WORKTREE,
};

describe('PlanRunWorktreeCleanupService', () => {
  let ctx: ReturnType<typeof build>;

  beforeEach(() => {
    ctx = build({ plan: planWith('on-pr') });
  });

  describe('when the run finished cleanly with a PR', () => {
    it('tears the worktree down and records the removal', async () => {
      const outcome = await ctx.service.afterRun(finished);

      expect(ctx.teardown).toHaveBeenCalledWith(WORKTREE);
      expect(outcome.kind).toBe('attempted');
      expect(ctx.saved).toEqual([
        expect.stringContaining(`removed worktree ${WORKTREE.worktreePath}`),
      ]);
    });

    it('also tears down after workflow_tasks_exhausted', async () => {
      await ctx.service.afterRun({
        ...finished,
        reason: 'workflow_tasks_exhausted',
      });

      expect(ctx.teardown).toHaveBeenCalledTimes(1);
    });

    it('records why the teardown service kept it', async () => {
      ctx.teardown.mockResolvedValueOnce({
        detail: 'it has uncommitted changes',
        outcome: PLAN_RUN_WORKTREE_TEARDOWN_OUTCOME.KEPT_DIRTY,
        worktreePath: WORKTREE.worktreePath,
      });

      await ctx.service.afterRun(finished);

      expect(ctx.saved).toEqual([expect.stringContaining('kept worktree')]);
      expect(ctx.saved[0]).toContain('uncommitted changes');
    });
  });

  describe('when the plan is set to keep its worktree', () => {
    it('skips the teardown and says so', async () => {
      ctx = build({ plan: planWith('keep') });

      const outcome = await ctx.service.afterRun(finished);

      expect(ctx.teardown).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({
        skip: PLAN_RUN_WORKTREE_CLEANUP_SKIP.KEEP,
      });
      expect(ctx.saved[0]).toContain('set to keep');
    });
  });

  describe('when the run did not finish in a teardown state', () => {
    it.each([
      'workflow_complete_handoff_owed',
      'workflow_cancelled',
      'workflow_max_iterations',
      'workflow_plan_already_terminal',
      'workflow_failed',
    ])('keeps the worktree after %s', async (reason) => {
      const outcome = await ctx.service.afterRun({ ...finished, reason });

      expect(ctx.teardown).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({
        skip: PLAN_RUN_WORKTREE_CLEANUP_SKIP.REASON,
      });
      expect(ctx.saved).toEqual([expect.stringContaining(reason)]);
    });
  });

  describe('when no PR was opened', () => {
    it('keeps the worktree', async () => {
      const outcome = await ctx.service.afterRun({
        ...finished,
        prNumber: undefined,
      });

      expect(ctx.teardown).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({
        skip: PLAN_RUN_WORKTREE_CLEANUP_SKIP.NO_PR,
      });
    });
  });

  describe('when the run worked in the base checkout', () => {
    it('does nothing and writes no output', async () => {
      const outcome = await ctx.service.afterRun({
        ...finished,
        worktree: null,
      });

      expect(ctx.teardown).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({
        skip: PLAN_RUN_WORKTREE_CLEANUP_SKIP.NO_WORKTREE,
      });
      expect(ctx.saved).toEqual([]);
    });
  });

  describe('when the plan cannot be read', () => {
    it('keeps the worktree when the lookup throws', async () => {
      ctx = build({ plan: new Error('db down') });

      const outcome = await ctx.service.afterRun(finished);

      expect(ctx.teardown).not.toHaveBeenCalled();
      expect(outcome).toMatchObject({
        skip: PLAN_RUN_WORKTREE_CLEANUP_SKIP.PLAN_UNREADABLE,
      });
    });

    it('keeps the worktree when the plan is gone', async () => {
      ctx = build({ plan: null });

      await ctx.service.afterRun(finished);

      expect(ctx.teardown).not.toHaveBeenCalled();
    });
  });
});
