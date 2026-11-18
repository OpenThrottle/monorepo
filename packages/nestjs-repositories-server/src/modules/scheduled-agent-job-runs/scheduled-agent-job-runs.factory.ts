/**
 * @description Fishery factory for {@link ScheduledAgentJobRun}. Use in tests to build mock rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity.ts';

/**
 * Factory for building ScheduledAgentJobRun-shaped objects: a freshly queued schedule-trigger run
 * by default. Override any field via .build({ status: 'running' }).
 * @public
 */
export const scheduledAgentJobRunsFactory =
  Factory.define<ScheduledAgentJobRun>(() => {
    return {
      bullmqJobId: faker.string.alphanumeric(10),
      cacheReadTokens: null,
      cacheWriteTokens: null,
      cancelRequestedAt: null,
      costUsd: null,
      createdAt: faker.date.recent(),
      driverId: 'claude',
      errorMessage: null,
      exitCode: null,
      finishedAt: null,
      id: faker.string.uuid(),
      inputTokens: null,
      model: null,
      outputTokens: null,
      rawUsage: null,
      reasoningTokens: null,
      repositoryCheckoutId: null,
      resolvedCwd: null,
      resumeOfRunId: null,
      scheduledAgentJobId: faker.string.uuid(),
      scheduledFor: null,
      settingsSnapshot: null,
      startedAt: null,
      status: 'queued',
      totalTokens: null,
      trigger: 'schedule',
      usageLimitResetsAt: null,
      usageLimitType: null,
    };
  });
