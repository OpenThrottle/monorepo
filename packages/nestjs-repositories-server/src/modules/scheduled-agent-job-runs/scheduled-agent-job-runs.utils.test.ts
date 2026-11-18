import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createScheduledAgentJobRunsRepositoryMock } from './scheduled-agent-job-runs.utils.ts';

describe('createScheduledAgentJobRunsRepositoryMock', () => {
  it('starts with no runs', async () => {
    const repository = createScheduledAgentJobRunsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findRunById('a')).resolves.toBeNull();
    await expect(repository.findRunResumingFrom('a')).resolves.toBeNull();
    await expect(repository.listRunsForJob('a')).resolves.toEqual([]);
    await expect(repository.listInFlightRuns()).resolves.toEqual([]);
    await expect(repository.countInFlightRunsByStatus()).resolves.toEqual([]);
    await expect(repository.countUsageLimitedInChain('a', 5)).resolves.toBe(0);
    await expect(
      repository.hasRunForSlot('a', new Date('2026-11-02T09:00:00Z')),
    ).resolves.toBe(false);
  });

  it('createRun resolves a queued row carrying its input', async () => {
    const repository = createScheduledAgentJobRunsRepositoryMock();

    const run = await repository.createRun({
      driverId: 'cursor',
      scheduledAgentJobId: 'job-1',
      trigger: 'manual',
    });

    expect(run).toMatchObject({
      driverId: 'cursor',
      scheduledAgentJobId: 'job-1',
      status: 'queued',
      trigger: 'manual',
    });
  });

  it('names the scheduled_agent_job_runs table in inherited not-found errors', async () => {
    const repository = createScheduledAgentJobRunsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'scheduled_agent_job_runs record with ID "a" not found',
    );
  });
});
