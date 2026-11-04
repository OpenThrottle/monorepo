import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import {
  type ScheduledAgentJob,
  ScheduledAgentJobCheckoutPathService,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import type { Queue } from 'bullmq';

import {
  SCHEDULED_AGENT_JOB_NAME,
  SCHEDULED_AGENT_JOB_OPTIONS,
  SCHEDULED_AGENT_JOB_SCHEDULER_PREFIX,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants.ts';
import {
  isSelfScheduledKind,
  nextSelfScheduledSlot,
  selfScheduledFireJobId,
} from './scheduled-agent-jobs.schedule-kind.ts';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types.ts';

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
 * repeatable scheduler keyed by the row's stable `schedulerKey` for a cron schedule, or of the one
 * pending delayed fire for an interval or once schedule. Lives in the PRODUCER module so both
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
    private readonly jobsService: ScheduledAgentJobsService,
  ) {}

  /**
   * @description Projects an enabled schedule row into BullMQ and returns its next fire time, or null
   * when it has none. A cron schedule registers/replaces its repeatable scheduler (the next fire is
   * read back from it). An interval or once schedule arms its one delayed fire instead; see
   * {@link armSelfScheduledFire}. Either way the projection of the other kind is removed, so changing
   * a schedule's kind never leaves the old one firing.
   */
  async upsertScheduler(job: ScheduledAgentJob): Promise<Date | null> {
    if (isSelfScheduledKind(job.scheduleKind)) {
      await this.queue.removeJobScheduler(job.schedulerKey);
      return this.armSelfScheduledFire(job, { lastFinishedAt: job.lastRunAt });
    }

    await this.removePendingFires(job.id);

    if (job.cronPattern === null) return null;

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

  /**
   * @description Enqueues the one late run a misfire policy owes an outage, for `slot`. The job id is
   * derived from the schedule and slot (BullMQ rejects a custom id containing `:`), so a second
   * enqueue for the same slot is a no-op; the run row's unique slot index is the real guard.
   */
  async enqueueCatchUp(job: ScheduledAgentJob, slot: Date): Promise<void> {
    await this.queue.add(
      SCHEDULED_AGENT_JOB_NAME,
      {
        ...buildScheduledAgentJobPayload(
          job,
          await this.resolveCheckoutPath(job),
        ),
        catchUpForSlotMs: slot.getTime(),
      },
      {
        ...SCHEDULED_AGENT_JOB_OPTIONS,
        jobId: `scheduled-job-catchup-${job.id}-${slot.getTime()}`,
      },
    );
  }

  /**
   * @description Arms the one pending fire of an interval or once schedule and returns its slot, or
   * null when there is nothing to arm. Any pending fire it had is removed first, so an edit takes
   * effect and two fires can never be armed at once.
   *
   * An interval counts `intervalMs` from `lastFinishedAt` (from now when unknown). A once schedule
   * fires at `runAt`, unless that slot already has a run: it has fired. A slot already in the past is
   * enqueued with no delay, so a fire the server was down for runs once, late.
   */
  async armSelfScheduledFire(
    job: ScheduledAgentJob,
    options: { readonly lastFinishedAt: Date | null },
  ): Promise<Date | null> {
    await this.removePendingFires(job.id);

    const now = new Date();
    const slot = nextSelfScheduledSlot(job, {
      lastFinishedAt: options.lastFinishedAt,
      now,
    });
    if (slot === null) return null;

    if (
      job.scheduleKind === 'once' &&
      (await this.jobsService.hasRunForSlot(job.id, slot))
    ) {
      return null;
    }

    await this.queue.add(
      SCHEDULED_AGENT_JOB_NAME,
      {
        ...buildScheduledAgentJobPayload(
          job,
          await this.resolveCheckoutPath(job),
        ),
        slotMs: slot.getTime(),
      },
      {
        ...SCHEDULED_AGENT_JOB_OPTIONS,
        delay: Math.max(0, slot.getTime() - now.getTime()),
        jobId: selfScheduledFireJobId(job.id, slot),
      },
    );

    return slot;
  }

  /**
   * @description Stops a schedule from firing, whatever its kind: removes its cron scheduler and any
   * pending interval/once fire. Idempotent.
   */
  async unschedule(job: ScheduledAgentJob): Promise<void> {
    await this.queue.removeJobScheduler(job.schedulerKey);
    await this.removePendingFires(job.id);
  }

  /** @description Removes the scheduler for a schedule row (idempotent — no-op when absent). */
  async removeScheduler(schedulerKey: string): Promise<void> {
    await this.queue.removeJobScheduler(schedulerKey);
  }

  /**
   * @description Removes a schedule's not-yet-started interval/once fires. A fire a worker has already
   * claimed is running and is left alone. Scans the pending sets, which hold a handful of jobs.
   */
  private async removePendingFires(scheduleId: string): Promise<void> {
    const pending = await this.queue.getJobs([
      'delayed',
      'prioritized',
      'waiting',
    ]);
    const fires = pending.filter(
      (candidate) =>
        candidate.data.scheduleId === scheduleId &&
        typeof candidate.data.slotMs === 'number',
    );

    await Promise.all(fires.map((fire) => fire.remove()));
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
