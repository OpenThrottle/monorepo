import { ForbiddenException } from '@nestjs/common';
import { queueJobLogTopic } from '@openthrottle/nestjs-graphql';
import { createMock } from '@golevelup/ts-vitest';
import type { PubSubEngine } from '@openthrottle/nestjs-graphql';
import { describe, expect, it, vi } from 'vitest';
import { QueueJobLogsResolver } from './queue-job-logs.resolver';
import { QueueJobLogsService } from './queue-job-logs.service';

const iterator = { next: vi.fn(), return: vi.fn(), throw: vi.fn() };

const makeResolver = (): {
  asyncIterator: ReturnType<typeof vi.fn>;
  read: ReturnType<typeof vi.fn>;
  resolver: QueueJobLogsResolver;
} => {
  const read = vi.fn().mockResolvedValue({
    events: [],
    hasMore: false,
    nextCursor: null,
  });
  const asyncIterator = vi.fn().mockReturnValue(iterator);

  const service = createMock<QueueJobLogsService>({ read });
  const pubSub = createMock<PubSubEngine>({ asyncIterator });

  return {
    asyncIterator,
    read,
    resolver: new QueueJobLogsResolver(service, pubSub),
  };
};

describe('QueueJobLogsResolver', () => {
  it('queueJobLogs delegates to the service', async () => {
    const { read, resolver } = makeResolver();
    const input = {
      after: null,
      jobId: 'job-1',
      levelIn: null,
      limit: null,
      queueName: 'plans-queue',
      since: null,
    };

    await resolver.queueJobLogs(input);

    expect(read).toHaveBeenCalledWith(input);
  });

  it('queueJobLogTail rejects an unauthenticated connection', () => {
    const { asyncIterator, resolver } = makeResolver();

    expect(() => resolver.queueJobLogTail('plans-queue', 'job-1', {})).toThrow(
      ForbiddenException,
    );
    expect(asyncIterator).not.toHaveBeenCalled();
  });

  it('queueJobLogTail subscribes to the (queue, job) topic when authenticated', () => {
    const { asyncIterator, resolver } = makeResolver();

    resolver.queueJobLogTail('plans-queue', 'job-1', { userId: 'user-42' });

    expect(asyncIterator).toHaveBeenCalledWith(
      queueJobLogTopic('plans-queue', 'job-1'),
    );
  });
});
