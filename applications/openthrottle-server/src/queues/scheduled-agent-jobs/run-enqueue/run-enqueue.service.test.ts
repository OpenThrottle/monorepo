import { createMock } from '@golevelup/ts-vitest';
import type { ScheduledAgentJobRunsRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createScheduledAgentJobRunsRepositoryMock,
  scheduledAgentJobRunsFactory,
  scheduledAgentJobsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { Queue } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ScheduledAgentJobPayload } from '../scheduled-agent-jobs.types.ts';
import { ScheduledAgentJobRunEnqueueService } from './run-enqueue.service.ts';

describe('ScheduledAgentJobRunEnqueueService', () => {
  const job = scheduledAgentJobsFactory.build({
    id: 'job-1',
    model: 'opus',
    prompt: 'job prompt',
  });
  let runs: ReturnType<typeof createScheduledAgentJobRunsRepositoryMock>;
  let queue: Queue<ScheduledAgentJobPayload, void>;
  let service: ScheduledAgentJobRunEnqueueService;

  beforeEach(() => {
    runs = createScheduledAgentJobRunsRepositoryMock();
    runs.createRun.mockResolvedValue(
      scheduledAgentJobRunsFactory.build({ id: 'run-9' }),
    );
    queue = createMock<Queue<ScheduledAgentJobPayload, void>>({
      add: vi.fn().mockResolvedValue({}),
    });
    service = new ScheduledAgentJobRunEnqueueService(
      queue,
      asMock<ScheduledAgentJobRunsRepository>(runs),
    );
  });

  it('pre-creates a queued run with the given trigger', async () => {
    await service.enqueueRun({ job, prompt: 'p', trigger: 'webhook' });

    expect(runs.createRun).toHaveBeenCalledWith({
      driverId: job.driverId,
      model: 'opus',
      scheduledAgentJobId: 'job-1',
      status: 'queued',
      trigger: 'webhook',
    });
  });

  it('enqueues with jobId = runId and the given prompt, not the job prompt', async () => {
    const run = await service.enqueueRun({
      job,
      prompt: 'rendered',
      trigger: 'webhook',
    });

    expect(queue.add).toHaveBeenCalledWith(
      'scheduled-agent-job',
      expect.objectContaining({
        prompt: 'rendered',
        runId: 'run-9',
        scheduleId: 'job-1',
      }),
      expect.objectContaining({ jobId: 'run-9' }),
    );
    expect(run.id).toBe('run-9');
  });
});
