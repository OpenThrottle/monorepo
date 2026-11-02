import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
  ScheduledAgentJobsService,
} from '@openthrottle/nestjs-repositories';
import type { UsageLimit } from '@openthrottle/openthrottle-drivers';
import type { Queue } from 'bullmq';

import {
  USAGE_LIMIT_RESUME_JOB_ID_PREFIX,
  USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
} from '../usage-limit/usage-limit.constants.ts';
import { decideScheduledUsageLimitResume } from '../usage-limit/usage-limit.utils.ts';
import {
  buildScheduledAgentJobPayload,
  ScheduledAgentJobSchedulerService,
} from './scheduled-agent-job-scheduler.service.ts';
import {
  SCHEDULED_AGENT_JOB_NAME,
  SCHEDULED_AGENT_JOB_OPTIONS,
  SCHEDULED_AGENT_JOBS_QUEUE_NAME,
} from './scheduled-agent-jobs.constants.ts';
import type { ScheduledAgentJobPayload } from './scheduled-agent-jobs.types.ts';

/**
 * @description What became of a usage-limited scheduled run: continued later (`resumed`, with the
 * continuation run's id) or left alone (`held`, with the reason shown on the limited run).
 */
export type ScheduledUsageLimitHandling =
  | { readonly outcome: 'held'; readonly reason: string }
  | { readonly outcome: 'resumed'; readonly resumeRunId: string };

const describeError = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

/**
 * @description The BullMQ jobId of the continuation for a limited run. Deterministic, so BullMQ
 * itself refuses a second enqueue for the same limited run. Unique per limited run (and a limited
 * run resumes at most once), so a retained completed job with this id can never swallow a legitimate
 * later enqueue — the gotcha documented in `plan-rules-evaluation.service.ts` does not apply.
 */
export const usageLimitResumeJobId = (limitedRunId: string): string => {
  return `${USAGE_LIMIT_RESUME_JOB_ID_PREFIX}${limitedRunId}`;
};

/**
 * @description Everything that happens after a scheduled-agent-job run, already recorded
 * `usage_limited`, hits a Claude subscription usage limit: decide via
 * {@link decideScheduledUsageLimitResume} whether to continue it, then either pre-create the
 * continuation run row (trigger `resume`, status `queued`, linked by `resume_of_run_id`) and enqueue
 * a delayed job that claims it, or hold. {@link ScheduledAgentJobUsageLimitResumeService.handle}
 * never throws: the limited BullMQ job must complete normally so it is never retried.
 *
 * Mirrors the plan-run `UsageLimitResumeService`; the one rule specific to a scheduled job is that
 * its own next cron fire at or before the resume time supersedes the continuation.
 */
@Injectable()
export class ScheduledAgentJobUsageLimitResumeService {
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly scheduler: ScheduledAgentJobSchedulerService,
    @InjectQueue(SCHEDULED_AGENT_JOBS_QUEUE_NAME)
    private readonly queue: Queue<ScheduledAgentJobPayload, void>,
  ) {}

  /**
   * @description Applies the resume policy to a run that was just recorded `usage_limited`. `now` is
   * injectable for tests. Never throws.
   */
  async handle(params: {
    readonly limit: UsageLimit;
    readonly limitedRunId: string;
    readonly now?: Date;
    readonly scheduleId: string;
  }): Promise<ScheduledUsageLimitHandling> {
    const { limit, limitedRunId, scheduleId } = params;
    const now = params.now ?? new Date();

    try {
      const job = await this.jobsService.findJobById(scheduleId);

      if (job === null) {
        return await this.hold(limitedRunId, 'the schedule no longer exists');
      }

      if (!job.enabled) {
        return await this.hold(limitedRunId, 'the schedule is disabled');
      }

      const chainDepth = await this.jobsService.countUsageLimitedInChain(
        limitedRunId,
        USAGE_LIMIT_RESUME_MAX_CHAIN_DEPTH,
      );
      const decision = decideScheduledUsageLimitResume({
        chainDepth,
        limit,
        nextRunAt: await this.readNextRunAt(job),
        now,
      });

      if (decision.kind === 'hold') {
        return await this.hold(limitedRunId, decision.reason);
      }

      return await this.resume({
        delayMs: decision.delayMs,
        job,
        limitedRunId,
      });
    } catch (error) {
      this.logger.warn(
        `Usage-limit handling failed for scheduled job ${scheduleId}, run ${limitedRunId}: ${describeError(error)}`,
        ScheduledAgentJobUsageLimitResumeService.name,
      );

      return this.hold(limitedRunId, 'resume bookkeeping failed');
    }
  }

  /**
   * @description The schedule's live next cron fire, read from the BullMQ scheduler (authoritative:
   * `scheduled_agent_jobs.next_run_at` is only refreshed on upsert and boot reconcile, so it goes
   * stale after the first fire). A read failure is treated as "no known fire" so the base policy
   * decides alone.
   */
  private async readNextRunAt(job: ScheduledAgentJob): Promise<Date | null> {
    try {
      return await this.scheduler.readNextRunAt(job.schedulerKey);
    } catch (error) {
      this.logger.warn(
        `Could not read the next fire time for scheduled job ${job.id}: ${describeError(error)}`,
        ScheduledAgentJobUsageLimitResumeService.name,
      );

      return null;
    }
  }

  /**
   * @description Pre-creates the continuation run row, then enqueues the delayed job that claims it.
   * Idempotent: a continuation already recorded for this limited run is reported, not duplicated —
   * both when found up front and when a concurrent writer wins the partial UNIQUE index on
   * `resume_of_run_id`. A failed enqueue removes the orphan row and holds.
   */
  private async resume(params: {
    readonly delayMs: number;
    readonly job: ScheduledAgentJob;
    readonly limitedRunId: string;
  }): Promise<ScheduledUsageLimitHandling> {
    const { delayMs, job, limitedRunId } = params;

    const existing = await this.jobsService.findRunResumingFrom(limitedRunId);
    if (existing !== null) {
      return { outcome: 'resumed', resumeRunId: existing.id };
    }

    const bullmqJobId = usageLimitResumeJobId(limitedRunId);
    const run = await this.createContinuationRun(
      job,
      limitedRunId,
      bullmqJobId,
    );

    if (run === null) {
      const winner = await this.jobsService.findRunResumingFrom(limitedRunId);

      if (winner === null) {
        return this.hold(limitedRunId, 'scheduling the resume failed');
      }

      return { outcome: 'resumed', resumeRunId: winner.id };
    }

    try {
      await this.queue.add(
        SCHEDULED_AGENT_JOB_NAME,
        { ...buildScheduledAgentJobPayload(job), runId: run.id },
        {
          ...SCHEDULED_AGENT_JOB_OPTIONS,
          delay: delayMs,
          jobId: bullmqJobId,
        },
      );
    } catch (error) {
      await this.jobsService
        .getRunRepository()
        .delete({ id: run.id })
        .catch(() => undefined);

      return this.hold(
        limitedRunId,
        `scheduling the resume failed: ${describeError(error)}`,
      );
    }

    return { outcome: 'resumed', resumeRunId: run.id };
  }

  /**
   * @description Inserts the queued continuation row, or returns null when the insert is rejected
   * (the unique index lost a race, or the DB is unwell); the caller disambiguates.
   */
  private async createContinuationRun(
    job: ScheduledAgentJob,
    limitedRunId: string,
    bullmqJobId: string,
  ): Promise<ScheduledAgentJobRun | null> {
    try {
      return await this.jobsService.createRun({
        bullmqJobId,
        driverId: job.driverId,
        model: job.model,
        resumeOfRunId: limitedRunId,
        scheduledAgentJobId: job.id,
        status: 'queued',
        trigger: 'resume',
      });
    } catch {
      return null;
    }
  }

  /** @description Records why the limited run was not resumed, on the run itself. Never throws. */
  private async hold(
    limitedRunId: string,
    reason: string,
  ): Promise<ScheduledUsageLimitHandling> {
    this.logger.info(
      `Scheduled run ${limitedRunId} hit a usage limit and is not being resumed: ${reason}`,
      ScheduledAgentJobUsageLimitResumeService.name,
    );

    try {
      const run = await this.jobsService.findRunById(limitedRunId);
      await this.jobsService.updateRunErrorMessage(
        limitedRunId,
        `${run?.errorMessage ?? 'Usage limit reached'}; not resumed automatically (${reason})`,
      );
    } catch (error) {
      this.logger.warn(
        `Could not record why run ${limitedRunId} was not resumed: ${describeError(error)}`,
        ScheduledAgentJobUsageLimitResumeService.name,
      );
    }

    return { outcome: 'held', reason };
  }
}
