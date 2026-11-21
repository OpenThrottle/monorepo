import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { ScheduledAgentJobRun } from '@openthrottle/nestjs-repositories-server';
import { ScheduledAgentJobRunsRepository } from '@openthrottle/nestjs-repositories-server';
import type { Queue } from 'bullmq';

import {
  SCHEDULED_AGENT_JOB_NAME,
  SCHEDULED_AGENT_JOB_OPTIONS,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from '../scheduled-agent-jobs.constants.ts';
import type { ScheduledAgentJobPayload } from '../scheduled-agent-jobs.types.ts';
import type { EnqueueScheduledAgentJobRunInput } from './run-enqueue.types.ts';

/**
 * @description Pre-creates a `queued` run row and enqueues it on the Scheduled Agent Jobs queue with
 * the BullMQ jobId set to the run id (so the JSONL log join is deterministic). The one enqueue path
 * shared by run-now (`trigger: 'manual'`) and webhook ingress (`trigger: 'webhook'`): the processor
 * sees the same payload shape either way, so it needs no branch per trigger.
 */
@Injectable()
export class ScheduledAgentJobRunEnqueueService {
  constructor(
    @InjectQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME)
    private readonly queue: Queue<ScheduledAgentJobPayload, void>,
    private readonly runsRepository: ScheduledAgentJobRunsRepository,
  ) {}

  /** @description Open the run row, then enqueue it. Returns the queued run. */
  async enqueueRun(
    input: EnqueueScheduledAgentJobRunInput,
  ): Promise<ScheduledAgentJobRun> {
    const { job } = input;

    const run = await this.runsRepository.createRun({
      driverId: job.driverId,
      model: job.model,
      scheduledAgentJobId: job.id,
      status: 'queued',
      trigger: input.trigger,
    });

    const payload: ScheduledAgentJobPayload = {
      cwd: job.cwd,
      driverId: job.driverId,
      model: job.model,
      prompt: input.prompt,
      repositoryCheckoutId: job.repositoryCheckoutId,
      runId: run.id,
      scheduleId: job.id,
      settings: job.settings,
      timeoutMs: job.timeoutMs,
    };

    await this.queue.add(SCHEDULED_AGENT_JOB_NAME, payload, {
      ...SCHEDULED_AGENT_JOB_OPTIONS,
      jobId: run.id,
    });

    return run;
  }
}
