import type { PubSubEngine } from '@openthrottle/nestjs-graphql';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service';

const publish = vi.fn().mockResolvedValue(undefined);
const warn = vi.fn();

function makeService(): NotificationsService {
  const pubSub = { publish } as unknown as PubSubEngine;
  const logger = { warn } as unknown as LoggerService;
  return new NotificationsService(pubSub, logger);
}

/** Topics passed to publish across all calls. */
function publishedTopics(): string[] {
  return publish.mock.calls.map((call) => call[0] as string);
}

afterEach(() => vi.clearAllMocks());

describe('NotificationsService PubSub fanout', () => {
  it('fans plan.status_changed out to the firehose + plan lifecycle topics', () => {
    makeService().emitPlanStatusChanged({ planId: 'p1', status: 'RUNNING' });

    expect(publishedTopics()).toEqual(
      expect.arrayContaining(['notifications:all', 'plan:p1:lifecycle']),
    );
    // Envelope is keyed by `event` with the discriminator set.
    const [, envelope] = publish.mock.calls[0] ?? [];
    expect((envelope as { event: { event: string } }).event.event).toBe(
      'plan.status_changed',
    );
  });

  it('fans task.completed out to the firehose + plan lifecycle topics', () => {
    makeService().emitTaskCompleted({
      message: 'done',
      planId: 'p2',
      taskId: 't9',
    });
    expect(publishedTopics()).toEqual(
      expect.arrayContaining(['notifications:all', 'plan:p2:lifecycle']),
    );
  });

  it('routes system.alert to the firehose + system alert topics', () => {
    makeService().emitSystemAlert({ message: 'maintenance' });
    expect(publishedTopics()).toEqual(
      expect.arrayContaining(['notifications:all', 'system:alert']),
    );
  });
});
