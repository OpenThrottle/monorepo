import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import {
  ScheduledAgentJobCheckoutPathService,
  type ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories';
import {
  SCHEDULED_AGENT_JOB_NAME,
  SCHEDULED_AGENT_JOB_OPTIONS,
  SCHEDULED_AGENT_JOB_SCHEDULER_PREFIX,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types';

/**
 * @description Builds the self-contained run snapshot embedded in the BullMQ scheduler (and re-used
 * by run-now), so the processor executes without a DB read. No `runId` — a scheduled fire creates its
 * own run row.
 *
 * `resolvedCheckoutPath` is the schedule's targeted checkout resolved to a directory at snapshot
 * time; it becomes the payload's `cwd` so a payload stays independently runnable. The checkout id
 * travels alongside it so the processor can re-resolve rather than trust a stale path.
 */
export const buildScheduledAgentJobPayload = (
  job: ScheduledAgentJob,
  resolvedCheckoutPath?: string | null,
): ScheduledAgentJobPayload => ({
  cwd: resolvedCheckoutPath ?? job.cwd,
  driverId: job.driverId,
  model: job.model,
  prompt: job.prompt,
  repositoryCheckoutId: job.repositoryCheckoutId,
  scheduleId: job.id,
  settings: job.settings,
  timeoutMs: job.timeoutMs,
});

/**
 * @description Owns the DB→BullMQ projection for scheduled agent jobs: idempotent upsert/remove of a
 * repeatable scheduler keyed by the row's stable `schedulerKey`. Lives in the PRODUCER module so both
 * the api process (GraphQL mutations) and the worker process (boot reconcile) share ONE instance and
 * hold the queue handle under any PROCESS_ROLE. Uses `upsertJobScheduler` (stable-id, replace-on-
 * change) — never legacy `queue.add({ repeat })` (pattern-hash keyed, leaves stale duplicates).
 */
@Injectable()
export class ScheduledAgentJobSchedulerService {
  constructor(
    private readonly checkoutPaths: ScheduledAgentJobCheckoutPathService,
    @InjectQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME)
    private readonly queue: Queue<ScheduledAgentJobPayload, void>,
  ) {}

  /**
   * @description Registers/replaces the repeatable scheduler for a schedule row and returns its next
   * fire time (read back from the scheduler), or null when unavailable.
   */
  async upsertScheduler(job: ScheduledAgentJob): Promise<Date | null> {
    const repeat = {
      pattern: job.cronPattern,
      ...(job.timezone ? { tz: job.timezone } : {}),
    };

    await this.queue.upsertJobScheduler(job.schedulerKey, repeat, {
      data: buildScheduledAgentJobPayload(
        job,
        await this.resolveCheckoutPath(job),
      ),
      name: SCHEDULED_AGENT_JOB_NAME,
      opts: SCHEDULED_AGENT_JOB_OPTIONS,
    });

    return this.readNextRunAt(job.schedulerKey);
  }

  /**
   * @description The schedule's targeted checkout as a directory, or null when it targets none or the
   * checkout no longer resolves. A miss is not an error here: the payload falls back to the legacy
   * `cwd`, and the processor re-resolves the checkout at fire time anyway.
   */
  private async resolveCheckoutPath(
    job: ScheduledAgentJob,
  ): Promise<string | null> {
    if (job.repositoryCheckoutId === null) return null;

    const resolved = await this.checkoutPaths.resolve({
      checkoutId: job.repositoryCheckoutId,
      ownerUserId: job.ownerUserId,
    });

    return 'path' in resolved ? resolved.path : null;
  }

  /** @description Removes the scheduler for a schedule row (idempotent — no-op when absent). */
  async removeScheduler(schedulerKey: string): Promise<void> {
    await this.queue.removeJobScheduler(schedulerKey);
  }

  /** @description Reads the next fire time for a scheduler id, or null when it has none/absent. */
  async readNextRunAt(schedulerKey: string): Promise<Date | null> {
    const scheduler = await this.queue.getJobScheduler(schedulerKey);
    return scheduler?.next ? new Date(scheduler.next) : null;
  }

  /**
   * @description All scheduler ids this feature owns (prefix `scheduled-job:`) currently registered in
   * Redis — the orphan-sweep input for boot reconciliation.
   */
  async listOwnedSchedulerIds(): Promise<string[]> {
    const schedulers = await this.queue.getJobSchedulers(0, -1, true);
    return schedulers
      .map((scheduler) => scheduler.id ?? scheduler.key)
      .filter(
        (id): id is string =>
          typeof id === 'string' &&
          id.startsWith(SCHEDULED_AGENT_JOB_SCHEDULER_PREFIX),
      );
  }
}
