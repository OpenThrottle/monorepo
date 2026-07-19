/**
 * @description Unit tests for the task-promotion worker: registration metadata
 * (queue name + concurrency) and that {@link TaskPromotionProcessor.process}
 * delegates to {@link TaskPromotionService} and returns its outcome verbatim.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it, vi } from 'vitest';
import {
  TASK_PROMOTION_QUEUE_NAME,
  TASK_PROMOTION_WORKER_CONCURRENCY,
} from './task-promotion.constants';
import { TaskPromotionProcessor } from './task-promotion.processor';
import type { TaskPromotionService } from './task-promotion.service';
import type { PromoteTaskJob } from './task-promotion.types';

const buildJob = (): PromoteTaskJob =>
  asMock<PromoteTaskJob>({
    data: {
      actorServiceAccountId: null,
      actorUserId: null,
      idempotencyKey: 'promote-task-1',
      taskId: '00000000-0000-4000-8000-000000000001',
    },
    name: 'promote',
  });

describe('TaskPromotionProcessor', () => {
  it('registers on the task-promotion queue with the configured concurrency', () => {
    const processorMetadata: unknown = Reflect.getMetadata(
      'bullmq:processor_metadata',
      TaskPromotionProcessor,
    );
    const workerMetadata: unknown = Reflect.getMetadata(
      'bullmq:worker_metadata',
      TaskPromotionProcessor,
    );

    expect(processorMetadata).toMatchObject({
      name: TASK_PROMOTION_QUEUE_NAME,
    });
    expect(workerMetadata).toMatchObject({
      concurrency: TASK_PROMOTION_WORKER_CONCURRENCY,
    });
  });

  it('delegates to the promotion service and returns its outcome', async () => {
    const service = createMock<TaskPromotionService>({
      promote: vi
        .fn()
        .mockResolvedValue({ newPlanId: 'plan-9', skipped: null }),
    });
    const processor = new TaskPromotionProcessor(
      createMock<LoggerService>(),
      service,
    );

    const result = await processor.process(buildJob());

    expect(service.promote).toHaveBeenCalledWith({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: '00000000-0000-4000-8000-000000000001',
    });
    expect(result).toEqual({ newPlanId: 'plan-9', skipped: null });
  });

  it('logs a no-op when the service skips (e.g. already promoted)', async () => {
    const logger = createMock<LoggerService>();
    const service = createMock<TaskPromotionService>({
      promote: vi
        .fn()
        .mockResolvedValue({ newPlanId: null, skipped: 'already-promoted' }),
    });
    const processor = new TaskPromotionProcessor(logger, service);

    const result = await processor.process(buildJob());

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('already-promoted'),
      TaskPromotionProcessor.name,
    );
    expect(result.skipped).toBe('already-promoted');
  });
});
