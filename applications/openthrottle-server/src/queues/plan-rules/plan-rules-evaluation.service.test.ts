/**
 * @description Unit tests for {@link PlanRulesEvaluationService.enqueueEvaluation}:
 * plan-scoped deduplication (one active + one waiting pass per plan; distinct
 * plans independent) and the never-throw fire-and-forget contract.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlanRulesEvaluationService } from './plan-rules-evaluation.service';
import {
  PLAN_RULES_EVALUATE_JOB_NAME,
  planRulesEvaluationDedupId,
} from './plan-rules.constants';
import type { PlanRulesEvaluateJobData } from './plan-rules.types';

const planId = '00000000-0000-4000-8000-000000000001';
const otherPlanId = '00000000-0000-4000-8000-000000000002';

describe('PlanRulesEvaluationService.enqueueEvaluation', () => {
  let service: PlanRulesEvaluationService;
  let queue: Queue<PlanRulesEvaluateJobData>;
  let logger: LoggerService;

  beforeEach(() => {
    queue = createMock<Queue<PlanRulesEvaluateJobData>>();
    logger = createMock<LoggerService>();
    service = new PlanRulesEvaluationService(logger, queue);
  });

  it('enqueues with a plan-scoped deduplication id and keepLastIfActive', async () => {
    await service.enqueueEvaluation(planId, 'task-created');

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      PLAN_RULES_EVALUATE_JOB_NAME,
      { planId, triggerKind: 'task-created' },
      {
        deduplication: {
          id: planRulesEvaluationDedupId(planId),
          keepLastIfActive: true,
        },
      },
    );
  });

  it('gives distinct plans distinct dedup ids so they evaluate independently', async () => {
    await service.enqueueEvaluation(planId, 'tag-changed');
    await service.enqueueEvaluation(otherPlanId, 'tag-changed');

    const dedupIds = vi
      .mocked(queue.add)
      .mock.calls.map((call) => call[2]?.deduplication?.id);
    expect(dedupIds).toEqual([
      planRulesEvaluationDedupId(planId),
      planRulesEvaluationDedupId(otherPlanId),
    ]);
    expect(new Set(dedupIds).size).toBe(2);
  });

  it('swallows enqueue failures (never throws) and logs the error', async () => {
    vi.mocked(queue.add).mockRejectedValueOnce(new Error('redis down'));

    await expect(
      service.enqueueEvaluation(planId, 'manual'),
    ).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledOnce();
  });
});
