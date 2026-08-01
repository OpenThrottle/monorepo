import { Injectable, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ScheduledAgentJobsService } from '@openthrottle/nestjs-repositories';
import { ScheduledAgentJobSchedulerService } from './scheduled-agent-job-scheduler.service';
import { resolveScheduledAgentJobsBootOwner } from './scheduled-agent-jobs.constants';

/**
 * @description Boot-time convergence of BullMQ schedulers to the DB (the authority): registers every
 * enabled schedule and removes any owned scheduler with no enabled row (orphan sweep — self-heals an
 * out-of-band removeJobScheduler / manual Redis edit on the next worker start). Lives in the worker
 * module so an api-only process never runs it. On-mutation upsert/remove is handled directly by the
 * shared {@link ScheduledAgentJobSchedulerService} from the GraphQL layer, NOT here.
 *
 * Gated by {@link resolveScheduledAgentJobsBootOwner} so many dev workers on one Redis don't fight
 * over the same scheduler set at boot; in production (single worker) the guard always owns.
 */
@Injectable()
export class ScheduledAgentJobsReconcileService implements OnModuleInit {
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly scheduler: ScheduledAgentJobSchedulerService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ownership = resolveScheduledAgentJobsBootOwner();
    if (!ownership.owner) {
      this.logger.info(
        `Scheduled-agent-jobs boot reconcile skipped: ${ownership.reason}`,
        ScheduledAgentJobsReconcileService.name,
      );
      return;
    }

    await this.reconcile();
  }

  /**
   * @description Idempotent DB→BullMQ convergence: upsert every enabled schedule (storing its
   * next-run time) and remove owned schedulers with no enabled row. Safe to run repeatedly.
   */
  async reconcile(): Promise<void> {
    const enabled = await this.jobsService.listEnabledJobs();
    const enabledKeys = new Set(enabled.map((job) => job.schedulerKey));

    for (const job of enabled) {
      // eslint-disable-next-line no-await-in-loop -- sequential idempotent upserts, small N
      const next = await this.scheduler.upsertScheduler(job);
      // eslint-disable-next-line no-await-in-loop -- sequential idempotent DB writes, small N
      await this.jobsService.updateNextRunAt(job.id, next);
    }

    const existingIds = await this.scheduler.listOwnedSchedulerIds();
    let removed = 0;
    for (const schedulerId of existingIds) {
      if (enabledKeys.has(schedulerId)) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop -- sequential idempotent orphan removals, small N
      await this.scheduler.removeScheduler(schedulerId);
      removed += 1;
    }

    this.logger.info(
      `Scheduled-agent-jobs reconciled: registered=${enabled.length}, orphansRemoved=${removed}`,
      ScheduledAgentJobsReconcileService.name,
    );
  }
}
