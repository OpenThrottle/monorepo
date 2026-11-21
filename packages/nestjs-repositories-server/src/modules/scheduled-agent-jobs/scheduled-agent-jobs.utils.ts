import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ScheduledAgentJob } from './scheduled-agent-job.entity.ts';
import type { ScheduledAgentJobsRepositoryMock } from './scheduled-agent-jobs.types.ts';

/**
 * @description Builds a {@link ScheduledAgentJobsRepositoryMock} that starts as an empty
 * `scheduled_agent_jobs` table (see `createBaseRepositoryMock`): lookups resolve null or an empty
 * list, writes match no row (null / false). Provide it in place of
 * `ScheduledAgentJobsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createScheduledAgentJobsRepositoryMock(): ScheduledAgentJobsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      ScheduledAgentJob,
      CreateModelInput<ScheduledAgentJob>
    >('scheduled_agent_jobs'),
    countJobsForOwner: vi.fn(async () => {
      return 0;
    }),
    createJob: vi.fn(async () => {
      return Promise.reject(
        new Error('scheduled_agent_jobs.createJob is not stubbed in this test'),
      );
    }),
    createJobWithinOwnerCaps: vi.fn(async () => {
      return Promise.reject(
        new Error(
          'scheduled_agent_jobs.createJobWithinOwnerCaps is not stubbed in this test',
        ),
      );
    }),
    deleteJob: vi.fn(async () => {
      return false;
    }),
    findJobById: vi.fn(async () => {
      return null;
    }),
    findJobByIdempotencyKey: vi.fn(async () => {
      return null;
    }),
    listEnabledJobs: vi.fn(async () => {
      return [];
    }),
    listJobs: vi.fn(async () => {
      return [];
    }),
    setJobEnabled: vi.fn(async () => {
      return null;
    }),
    updateJob: vi.fn(async () => {
      return null;
    }),
    updateNextRunAt: vi.fn(async () => {
      return undefined;
    }),
  };
}
