import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createScheduledAgentJobsRepositoryMock } from './scheduled-agent-jobs.utils.ts';

describe('createScheduledAgentJobsRepositoryMock', () => {
  it('starts with no schedules', async () => {
    const repository = createScheduledAgentJobsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.listJobs()).resolves.toEqual([]);
    await expect(repository.listEnabledJobs()).resolves.toEqual([]);
    await expect(repository.findJobById('a')).resolves.toBeNull();
    await expect(repository.updateJob('a', {})).resolves.toBeNull();
    await expect(repository.setJobEnabled('a', true)).resolves.toBeNull();
    await expect(repository.deleteJob('a')).resolves.toBe(false);
  });

  it('rejects createJob until a test stubs it', async () => {
    const repository = createScheduledAgentJobsRepositoryMock();

    await expect(
      repository.createJob({
        cronPattern: '0 * * * *',
        driverId: 'claude',
        name: 'n',
        prompt: 'p',
      }),
    ).rejects.toThrow('not stubbed');
  });

  it('names the scheduled_agent_jobs table in inherited not-found errors', async () => {
    const repository = createScheduledAgentJobsRepositoryMock();

    await expect(repository.remove('a')).rejects.toThrow(NotFoundException);
    await expect(repository.remove('a')).rejects.toThrow(
      'scheduled_agent_jobs record with ID "a" not found',
    );
  });
});
