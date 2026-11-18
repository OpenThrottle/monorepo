import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ScheduledAgentJobRun } from './scheduled-agent-job-run.entity.ts';
import { scheduledAgentJobRunsFactory } from './scheduled-agent-job-runs.factory.ts';
import type { ScheduledAgentJobRunsRepositoryMock } from './scheduled-agent-job-runs.types.ts';

/**
 * @description Builds a {@link ScheduledAgentJobRunsRepositoryMock} that starts as an empty
 * `scheduled_agent_job_runs` table (see `createBaseRepositoryMock`): lookups resolve null or an
 * empty list, counts are zero, predicates are false, and writes are no-ops. `createRun` resolves a
 * factory row carrying its input. Provide it in place of `ScheduledAgentJobRunsRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createScheduledAgentJobRunsRepositoryMock(): ScheduledAgentJobRunsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      ScheduledAgentJobRun,
      CreateModelInput<ScheduledAgentJobRun>
    >('scheduled_agent_job_runs'),
    claimScheduledSlot: vi.fn(async () => {
      return null;
    }),
    countInFlightRunsByStatus: vi.fn(async () => {
      return [];
    }),
    countRunsByStatusSince: vi.fn(async () => {
      return [];
    }),
    countUsageLimitedInChain: vi.fn(async () => {
      return 0;
    }),
    createRun: vi.fn(async (input) => {
      return scheduledAgentJobRunsFactory.build({
        bullmqJobId: input.bullmqJobId ?? null,
        driverId: input.driverId,
        model: input.model ?? null,
        repositoryCheckoutId: input.repositoryCheckoutId ?? null,
        resolvedCwd: input.resolvedCwd ?? null,
        resumeOfRunId: input.resumeOfRunId ?? null,
        scheduledAgentJobId: input.scheduledAgentJobId,
        scheduledFor: input.scheduledFor ?? null,
        settingsSnapshot: input.settingsSnapshot ?? null,
        status: input.status ?? 'queued',
        trigger: input.trigger,
      });
    }),
    findLatestScheduledFor: vi.fn(async () => {
      return null;
    }),
    findRunById: vi.fn(async () => {
      return null;
    }),
    findRunResumingFrom: vi.fn(async () => {
      return null;
    }),
    hasLateRunSince: vi.fn(async () => {
      return false;
    }),
    hasLiveScheduledRun: vi.fn(async () => {
      return false;
    }),
    hasRunForSlot: vi.fn(async () => {
      return false;
    }),
    listInFlightRuns: vi.fn(async () => {
      return [];
    }),
    listRunsForJob: vi.fn(async () => {
      return [];
    }),
    markRunFinished: vi.fn(async () => {
      return undefined;
    }),
    markRunStarted: vi.fn(async () => {
      return undefined;
    }),
    recordMissedRuns: vi.fn(async () => {
      return 0;
    }),
    requestRunCancel: vi.fn(async () => {
      return undefined;
    }),
    updateRunErrorMessage: vi.fn(async () => {
      return undefined;
    }),
  };
}
