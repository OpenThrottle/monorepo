import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { PlanCancelChannelService } from './plan-cancel-channel.service';
import { PlanRunCancellationService } from './plan-run-cancellation.service';
import type { RunPlanJobData } from './plans.types';

const PLAN_ID = '2ab62876-4c4c-4b7e-8fc1-82d1ede05715';

describe('PlanCancelChannelService', () => {
  const mockAbort = vi.fn().mockReturnValue(true);
  const pmessageHandlers: Array<(...args: unknown[]) => void> = [];

  // Minimal structural fakes for the ioredis surface the service touches. Fed to the
  // service through the loosely-typed `client` getter below so we avoid re-declaring
  // ioredis's heavily-overloaded Redis type.
  const subscriber = {
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      if (event === 'pmessage') {
        pmessageHandlers.push(listener);
      }
    }),
    psubscribe: vi.fn().mockResolvedValue(1),
    quit: vi.fn().mockResolvedValue('OK'),
  };
  const publish = vi.fn().mockResolvedValue(1);
  const baseClient = {
    duplicate: () => subscriber,
    publish,
  };

  const plansQueue = createMock<Queue<RunPlanJobData, void>>();
  // `client` is a getter returning Promise<RedisClient>; resolve it to the fake base client.
  Object.defineProperty(plansQueue, 'client', {
    get: () => Promise.resolve(baseClient),
  });

  const build = (): PlanCancelChannelService =>
    new PlanCancelChannelService(
      createMock<LoggerService>(),
      createMock<PlanRunCancellationService>({ abort: mockAbort }),
      plansQueue,
    );

  beforeEach(() => {
    mockAbort.mockClear();
    publish.mockClear();
    subscriber.psubscribe.mockClear();
    subscriber.quit.mockClear();
    pmessageHandlers.length = 0;
  });

  it('psubscribes to the plan-cancel pattern on bootstrap', async () => {
    const service = build();
    await service.onApplicationBootstrap();

    expect(subscriber.psubscribe).toHaveBeenCalledWith('plan:*:cancel');
    expect(pmessageHandlers).toHaveLength(1);
  });

  it('aborts the local controller for a valid cancel channel', async () => {
    const service = build();
    await service.onApplicationBootstrap();

    pmessageHandlers[0]('plan:*:cancel', `plan:${PLAN_ID}:cancel`, '1');

    expect(mockAbort).toHaveBeenCalledWith(PLAN_ID);
  });

  it('ignores a malformed channel', async () => {
    const service = build();
    await service.onApplicationBootstrap();

    pmessageHandlers[0]('plan:*:cancel', 'not-a-cancel-channel', '1');

    expect(mockAbort).not.toHaveBeenCalled();
  });

  it('publishCancel publishes to plan:<id>:cancel', async () => {
    const service = build();
    await service.publishCancel(PLAN_ID);

    expect(publish).toHaveBeenCalledWith(`plan:${PLAN_ID}:cancel`, '1');
  });

  it('quits the subscriber connection on shutdown', async () => {
    const service = build();
    await service.onApplicationBootstrap();
    await service.onApplicationShutdown();

    expect(subscriber.quit).toHaveBeenCalledTimes(1);
  });
});
