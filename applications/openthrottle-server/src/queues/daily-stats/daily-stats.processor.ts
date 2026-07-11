import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  DailyStatsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { And, LessThan, MoreThanOrEqual } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { DAILY_STATS_QUEUE_NAME } from './daily-stats.constants';
import {
  addUtcDaysToYmd,
  enumerateYmdRange,
  getPreviousUtcDayYmd,
  getUtcDayBounds,
} from './daily-stats.dates';
import type {
  AggregateDailyStatsJob,
  CatchUpSummary,
  DailyStatsAggregate,
} from './daily-stats.types';

const CONCURRENCY = 1;

/**
 * @description Upper bound on how many days back a single catch-up run will
 * backfill. Caps work (and notification noise) after long downtime; older holes
 * are left for a manual backfill rather than silently scanning the whole table.
 */
const MAX_CATCHUP_DAYS = 60;

/**
 * @description Processes daily stats aggregation jobs. Runs on a schedule (6am
 * UTC) and, on boot + each run, self-heals any missed days by backfilling every
 * gap between the last persisted `daily_stats.date` and yesterday (UTC).
 */
@Processor(DAILY_STATS_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: CONCURRENCY,
})
export class DailyStatsProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly dailyStatsService: DailyStatsService,
    private readonly logger: LoggerService,
    private readonly notifications: NotificationsService,
    private readonly plansService: PlansService,
    private readonly tasksService: TasksService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    const message = `Daily stats queue worker started (concurrency=${CONCURRENCY})`;
    this.logger.info(message, DailyStatsProcessor.name);

    // Self-heal on boot: a worker that was down at 6am UTC never wrote those
    // days. Backfill them now so downtime doesn't leave permanent holes. Guarded
    // so a backfill failure never blocks worker startup.
    try {
      await this.runCatchUp();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Daily stats on-boot catch-up failed: ${detail}`,
        DailyStatsProcessor.name,
      );
    }
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    const message = `Daily stats queue worker shutting down (signal=${signal ?? 'unknown'})`;

    this.logger.info(message, DailyStatsProcessor.name);
    await this.worker.close();
  }

  async process(job: AggregateDailyStatsJob): Promise<void> {
    const message = `Daily stats job started: jobId=${job.id}`;

    this.logger.info(message, DailyStatsProcessor.name);

    try {
      await this.runCatchUp();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `♦️ Daily stats job failed: jobId=${job.id}, error=${detail}`,
        DailyStatsProcessor.name,
      );
      this.notifications.emitQueueJobCompleted({
        jobType: 'daily-stats',
        message: `Daily stats job failed: ${job.id}`,
        severity: 'error',
      });
    }
  }

  /**
   * @description Aggregates + persists every calendar day (UTC) missing from
   * daily_stats between the last persisted date and yesterday, bounded to the
   * last {@link MAX_CATCHUP_DAYS} days. Idempotent: already-present days are
   * skipped, so a re-run with no gaps is a no-op. Emits a single summary
   * notification for the batch (never one per day). Returns the batch summary.
   */
  async runCatchUp(): Promise<CatchUpSummary> {
    const yesterdayYmd = getPreviousUtcDayYmd();
    const flooredStartYmd = addUtcDaysToYmd(
      yesterdayYmd,
      -(MAX_CATCHUP_DAYS - 1),
    );

    const latestYmd = await this.dailyStatsService.getLatestDate();
    const startYmd =
      latestYmd == null
        ? flooredStartYmd
        : maxYmd(addUtcDaysToYmd(latestYmd, 1), flooredStartYmd);

    // Already current (or ahead): nothing to aggregate.
    if (startYmd > yesterdayYmd) {
      return { backfilled: [], from: startYmd, skipped: [], to: yesterdayYmd };
    }

    const candidates = enumerateYmdRange(startYmd, yesterdayYmd);
    const existing = await this.dailyStatsService.getExistingDatesInRange(
      startYmd,
      yesterdayYmd,
    );
    const missing = candidates.filter((ymd) => !existing.has(ymd));
    const skipped = candidates.filter((ymd) => existing.has(ymd));

    // Sequential on purpose: each day's aggregation fans out to ~10 count/find
    // queries, so backfilling a long gap concurrently would swamp the DB.
    for (const ymd of missing) {
      // eslint-disable-next-line no-await-in-loop -- see note above
      const aggregate = await this.aggregateDailyStats(ymd);
      // eslint-disable-next-line no-await-in-loop -- see note above
      await this.dailyStatsService.upsertForDate(aggregate.date, {
        plansByStatus: aggregate.plansByStatus,
        plansCompleted: aggregate.plansCompleted,
        plansCreated: aggregate.plansCreated,
        plansUpdated: aggregate.plansUpdated,
        tasksByStatus: aggregate.tasksByStatus,
        tasksCompleted: aggregate.tasksCompleted,
        tasksCreated: aggregate.tasksCreated,
        tasksUpdated: aggregate.tasksUpdated,
      });
    }

    const summary: CatchUpSummary = {
      backfilled: missing,
      from: startYmd,
      skipped,
      to: yesterdayYmd,
    };
    this.reportCatchUp(summary);

    return summary;
  }

  /**
   * @description Logs the catch-up outcome and, when at least one day was
   * written, emits ONE success notification for the batch.
   */
  private reportCatchUp(summary: CatchUpSummary): void {
    const { backfilled, skipped } = summary;

    if (backfilled.length === 0) {
      this.logger.log(
        `Daily stats catch-up: no missing days in ${summary.from}..${summary.to} (${skipped.length} already present)`,
        DailyStatsProcessor.name,
      );

      return;
    }

    this.logger.log(
      `Daily stats catch-up: backfilled ${backfilled.length} day(s) [${backfilled.join(', ')}]; skipped ${skipped.length} already present`,
      DailyStatsProcessor.name,
    );

    const message =
      backfilled.length === 1
        ? `Daily stats aggregated for ${backfilled[0]}`
        : `Daily stats backfilled ${backfilled.length} days (${backfilled[0]}..${backfilled[backfilled.length - 1]})`;

    this.notifications.emitQueueJobCompleted({
      jobType: 'daily-stats',
      message,
      severity: 'success',
    });
  }

  /**
   * @description Aggregates plan and task stats for a single calendar day (UTC).
   * Defaults to the previous UTC day (the scheduled job's target); pass an
   * explicit `YYYY-MM-DD` to aggregate an arbitrary day during catch-up.
   */
  async aggregateDailyStats(
    targetYmd: string = getPreviousUtcDayYmd(),
  ): Promise<DailyStatsAggregate> {
    const { dayEnd, dayStart } = getUtcDayBounds(targetYmd);
    const planRepo = this.plansService.getRepository();
    const taskRepo = this.tasksService.getRepository();
    const createdInRange = {
      createdAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
    };
    const updatedInRange = {
      updatedAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
    };
    // Completions are attributed by immutable completed_at (set once on
    // transition into COMPLETED), not mutable updated_at — see migration 056.
    const completedInRange = {
      completedAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
    };

    const [
      plansCreated,
      plansUpdated,
      plansCompleted,
      plansCreatedInDay,
      plansUpdatedInDay,
      tasksCreated,
      tasksUpdated,
      tasksCompleted,
      tasksCreatedInDay,
      tasksUpdatedInDay,
    ] = await Promise.all([
      planRepo.count({ where: createdInRange }),
      planRepo.count({ where: updatedInRange }),
      planRepo.count({ where: completedInRange }),
      planRepo.find({
        select: ['id', 'status'],
        where: createdInRange,
      }),
      planRepo.find({
        select: ['id', 'status'],
        where: updatedInRange,
      }),
      taskRepo.count({ where: createdInRange }),
      taskRepo.count({ where: updatedInRange }),
      taskRepo.count({ where: completedInRange }),
      taskRepo.find({
        select: ['id', 'status'],
        where: createdInRange,
      }),
      taskRepo.find({
        select: ['id', 'status'],
        where: updatedInRange,
      }),
    ]);

    const plansByStatus = countByStatus(
      mergeByIdAndGetStatuses(plansCreatedInDay, plansUpdatedInDay),
    );
    const tasksByStatus = countByStatus(
      mergeByIdAndGetStatuses(tasksCreatedInDay, tasksUpdatedInDay),
    );

    return {
      date: targetYmd,
      plansByStatus,
      plansCompleted,
      plansCreated,
      plansUpdated,
      tasksByStatus,
      tasksCompleted,
      tasksCreated,
      tasksUpdated,
    };
  }
}

/**
 * @description Returns the later (chronologically greater) of two ymd strings.
 * Relies on zero-padded ISO ymds comparing correctly as strings.
 */
function maxYmd(a: string, b: string): string {
  return a >= b ? a : b;
}

interface IdStatus {
  id: string;
  status: string;
}

function mergeByIdAndGetStatuses(
  a: IdStatus[],
  b: IdStatus[],
): (string | null)[] {
  const byId = new Map<string, string>();
  for (const x of a) byId.set(x.id, x.status);
  for (const x of b) byId.set(x.id, x.status);
  return [...byId.values()];
}

function countByStatus(statuses: (string | null)[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of statuses) {
    const key = s ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
