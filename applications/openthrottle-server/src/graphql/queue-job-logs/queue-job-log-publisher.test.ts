import { queueJobLogTopic } from '@openthrottle/nestjs-graphql';
import { createMock } from '@golevelup/ts-vitest';
import type { PubSubEngine } from '@openthrottle/nestjs-graphql';
import { describe, expect, it, vi } from 'vitest';
import { encodeQueueJobLogCursor } from './queue-job-log-cursor';
import { createQueueJobLogTailPublisher } from './queue-job-log-publisher';

const TS = '2026-05-04T23:00:00.000Z';

describe('createQueueJobLogTailPublisher', () => {
  it('publishes a mapped, cursor-stamped event on the (queue, job) topic', () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const pubSub = createMock<PubSubEngine>({ publish });
    const onAppend = createQueueJobLogTailPublisher(pubSub);

    onAppend(
      'plans-queue',
      'job-1',
      {
        data: 'hello',
        source: 'workflow-ralph',
        timestamp: TS,
        type: 'stdout',
      },
      4,
    );

    expect(publish).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledWith(
      queueJobLogTopic('plans-queue', 'job-1'),
      {
        queueJobLogTail: {
          // cursor is positioned AFTER the event → lineIndex + 1.
          cursor: encodeQueueJobLogCursor(5),
          jobId: 'job-1',
          level: 'info',
          message: 'hello',
          queueName: 'plans-queue',
          source: 'workflow-ralph',
          timestamp: new Date(TS),
        },
      },
    );
  });

  it('redacts secrets before publishing', () => {
    const publish = vi.fn().mockResolvedValue(undefined);
    const pubSub = createMock<PubSubEngine>({ publish });
    const onAppend = createQueueJobLogTailPublisher(pubSub);

    onAppend(
      'plans-queue',
      'job-1',
      {
        data: 'Authorization: Bearer sk-LIVE-secret-123',
        timestamp: TS,
        type: 'stderr',
      },
      0,
    );

    const payload = publish.mock.calls[0][1];
    expect(JSON.stringify(payload)).not.toContain('sk-LIVE-secret-123');
    expect(payload.queueJobLogTail.message).toContain('[REDACTED]');
  });
});
