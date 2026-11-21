/**
 * @description Fishery factory for {@link ScheduledAgentJob}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import { schedulerKeyForJob } from './scheduler-key/scheduler-key.utils.ts';

/**
 * Factory for building ScheduledAgentJob-shaped objects: a live, enabled hourly cron schedule by
 * default. Override any field via .build({ scheduleKind: 'once' }).
 * @public
 */
export const scheduledAgentJobsFactory = Factory.define<ScheduledAgentJob>(
  () => {
    const id = faker.string.uuid();

    return {
      approvalState: 'not_required',
      createdAt: faker.date.past(),
      createdVia: 'ui',
      cronPattern: '0 * * * *',
      cwd: null,
      deletedAt: null,
      driverId: 'claude',
      enabled: true,
      id,
      idempotencyKey: null,
      intervalMs: null,
      lastRunAt: null,
      misfirePolicy: 'skip',
      misfireThresholdMs: 600_000,
      model: null,
      name: faker.lorem.words(3),
      nextRunAt: null,
      ownerUserId: faker.string.uuid(),
      prompt: faker.lorem.sentence(),
      repositoryCheckoutId: null,
      runAt: null,
      scheduleKind: 'cron',
      schedulerKey: schedulerKeyForJob(id),
      settings: {},
      timeoutMs: null,
      timezone: null,
      updatedAt: faker.date.recent(),
    };
  },
);
