import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Redis } from 'ioredis';
import { PlanCancelChannelService } from './plan-cancel-channel.service';
import type { PlanRunCancellationService } from './plan-run-cancellation.service';

const PLAN_ID = '2ab62876-4c4c-4b7e-8fc1-82d1ede05715';

describe('PlanCancelChannelService', () => {
  const mockAbort = vi.fn().mockReturnValue(true);
  const pmessageHandlers: Array<(...args: unknown[]) => void> = [];

  // The dedicated control-plane ioredis client and the subscribe-mode
  // connection it `duplicate()`s. The service publishes on the base client and
  // psubscribes on the duplicate.
  const subscriber = createMock<Redis>();
  const redis = createMock<Redis>();

  const build = (): PlanCancelChannelService =>
    new PlanCancelChannelService(
      createMock<LoggerService>(),
      createMock<PlanRunCancellationService>({ abort: mockAbort }),
      redis,
    );

  beforeEach(() => {
    mockAbort.mockClear();
    pmessageHandlers.length = 0;

    subscriber.on.mockReset();
    subscriber.on.mockImplementation((event, listener) => {
      if (event === 'pmessage') {
        pmessageHandlers.push(listener);
      }

      return subscriber;
    });
    subscriber.psubscribe.mockReset();
    subscriber.psubscribe.mockResolvedValue(1);
    subscriber.quit.mockReset();
    subscriber.quit.mockResolvedValue('OK');

    redis.duplicate.mockReturnValue(subscriber);
    redis.publish.mockReset();
    redis.publish.mockResolvedValue(1);
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

    expect(redis.publish).toHaveBeenCalledWith(`plan:${PLAN_ID}:cancel`, '1');
  });

  it('quits the subscriber connection on shutdown', async () => {
    const service = build();
    await service.onApplicationBootstrap();
    await service.onApplicationShutdown();

    expect(subscriber.quit).toHaveBeenCalledTimes(1);
  });
});
