/**
 * @description Unit tests for {@link PlanRulesEvaluationService.enqueueEvaluation}:
 * plan- and environment-scoped deduplication (one active + one waiting pass per
 * plan and environment; distinct plans and environments independent) and the never-throw fire-and-forget contract.
 */

import { createMock } from '@golevelup/ts-vitest';
import type {
  GlobalClsService,
  LoggerService,
} from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAN_RULES_EVALUATE_JOB_NAME } from '../plan-rules.constants.ts';
import type { PlanRulesEvaluateJobData } from '../plan-rules.types.ts';
import { planRulesEvaluationDedupId } from '../plan-rules.utils.ts';
import { PlanRulesEvaluationService } from './evaluation.service.ts';

const planId = '00000000-0000-4000-8000-000000000001';
const otherPlanId = '00000000-0000-4000-8000-000000000002';

describe('PlanRulesEvaluationService.enqueueEvaluation', () => {
  let service: PlanRulesEvaluationService;
  let queue: Queue<PlanRulesEvaluateJobData>;
  let logger: LoggerService;
  let globalCls: GlobalClsService;

  beforeEach(() => {
    queue = createMock<Queue<PlanRulesEvaluateJobData>>();
    logger = createMock<LoggerService>();
    globalCls = createMock<GlobalClsService>();
    service = new PlanRulesEvaluationService(globalCls, logger, queue);
  });

  it('enqueues with a plan-scoped deduplication id and keepLastIfActive', async () => {
    await service.enqueueEvaluation(planId, 'task-created', 'ralph');

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      PLAN_RULES_EVALUATE_JOB_NAME,
      { environment: 'ralph', planId, triggerKind: 'task-created' },
      {
        deduplication: {
          id: planRulesEvaluationDedupId(planId, 'ralph'),
          keepLastIfActive: true,
        },
      },
    );
  });

  it('gives distinct plans distinct dedup ids so they evaluate independently', async () => {
    await service.enqueueEvaluation(planId, 'tag-changed', null);
    await service.enqueueEvaluation(otherPlanId, 'tag-changed', null);

    const dedupIds = vi
      .mocked(queue.add)
      .mock.calls.map((call) => call[2]?.deduplication?.id);
    expect(dedupIds).toEqual([
      planRulesEvaluationDedupId(planId, null),
      planRulesEvaluationDedupId(otherPlanId, null),
    ]);
    expect(new Set(dedupIds).size).toBe(2);
  });

  it('carries a null environment on the job data', async () => {
    await service.enqueueEvaluation(planId, 'manual', null);

    expect(vi.mocked(queue.add).mock.calls[0]?.[1]).toEqual({
      environment: null,
      planId,
      triggerKind: 'manual',
    });
  });

  it('keeps passes for different environments of one plan from collapsing', async () => {
    await service.enqueueEvaluation(planId, 'status-changed', 'ralph');
    await service.enqueueEvaluation(planId, 'status-changed', null);
    await service.enqueueEvaluation(planId, 'status-changed', 'ralph');

    const dedupIds = vi
      .mocked(queue.add)
      .mock.calls.map((call) => call[2]?.deduplication?.id);
    expect(dedupIds[0]).toBe(dedupIds[2]);
    expect(dedupIds[0]).not.toBe(dedupIds[1]);
  });

  it('swallows enqueue failures (never throws) and logs the error', async () => {
    vi.mocked(queue.add).mockRejectedValueOnce(new Error('redis down'));

    await expect(
      service.enqueueEvaluation(planId, 'manual', null),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });

  describe('requestEnvironment', () => {
    it('is null outside a request context', () => {
      vi.mocked(globalCls.isActive).mockReturnValue(false);

      expect(service.requestEnvironment()).toBeNull();
      expect(globalCls.get).not.toHaveBeenCalled();
    });

    it('reads a known environment from the request header', () => {
      vi.mocked(globalCls.isActive).mockReturnValue(true);
      vi.mocked(globalCls.get).mockReturnValue('Ralph');

      expect(service.requestEnvironment()).toBe('ralph');
    });

    it('is null for a missing or unknown header value', () => {
      vi.mocked(globalCls.isActive).mockReturnValue(true);
      vi.mocked(globalCls.get).mockReturnValueOnce(undefined);
      expect(service.requestEnvironment()).toBeNull();

      vi.mocked(globalCls.get).mockReturnValueOnce('staging');
      expect(service.requestEnvironment()).toBeNull();
    });
  });
});
