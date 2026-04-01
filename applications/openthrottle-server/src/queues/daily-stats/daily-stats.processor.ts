import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { defaultWorkerOptionsForRecovery } from '@openthrottle/nestjs-bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import {
  DailyStatsService,
  PlansService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { And, LessThan, MoreThanOrEqual } from 'typeorm';
import { NotificationsService } from '../../notifications/notifications.service';
import { DAILY_STATS_QUEUE_NAME } from './daily-stats.constants';
import type {
  AggregateDailyStatsJob,
  DailyStatsAggregate,
} from './daily-stats.types';

const CONCURRENCY = 1;

/**
 * @description Returns the previous calendar day boundaries in UTC [start, end).
 */
function getPreviousUtcDayBounds(): {
  dateYmd: string;
  dayEnd: Date;
  dayStart: Date;
} {
  const now = new Date();
  const dayEnd = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const dayStart = new Date(dayEnd);
  dayStart.setUTCDate(dayStart.getUTCDate() - 1);
  const y = dayStart.getUTCFullYear();
  const m = String(dayStart.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dayStart.getUTCDate()).padStart(2, '0');
  const dateYmd = `${y}-${m}-${d}`;
  return { dateYmd, dayEnd, dayStart };
}

/**
 * @description Processes daily stats aggregation jobs. Runs on a schedule (e.g. 6am UTC) and aggregates plans/tasks stats for the previous day.
 */
@Processor(DAILY_STATS_QUEUE_NAME, {
  ...defaultWorkerOptionsForRecovery,
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

  onModuleInit(): void {
    const message = `Daily stats queue worker started (concurrency=${CONCURRENCY})`;

    this.logger.info(message, DailyStatsProcessor.name);
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    const message = `Daily stats queue worker shutting down (signal=${signal ?? 'unknown'})`;

    this.logger.info(message, DailyStatsProcessor.name);
    await this.worker.close();
  }

  async process(job: AggregateDailyStatsJob): Promise<void> {
    const message = `Daily stats job started: jobId=${job.id}`;

    this.logger.info(message, DailyStatsProcessor.name);

    const aggregate = await this.aggregateDailyStats();
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
    this.logger.log(
      `Daily stats aggregated for ${aggregate.date}: plans created=${aggregate.plansCreated} completed=${aggregate.plansCompleted} updated=${aggregate.plansUpdated}; tasks created=${aggregate.tasksCreated} completed=${aggregate.tasksCompleted} updated=${aggregate.tasksUpdated}`,
      DailyStatsProcessor.name,
    );

    this.notifications.emitQueueJobCompleted({
      jobType: 'daily-stats',
      message: `Daily stats aggregated for ${aggregate.date}`,
      severity: 'success',
    });
  }

  /**
   * @description Aggregates plan and task stats for the previous calendar day (UTC). Used by process() and by persistence (daily_stats table) when added.
   */
  async aggregateDailyStats(): Promise<DailyStatsAggregate> {
    const { dateYmd, dayEnd, dayStart } = getPreviousUtcDayBounds();
    const planRepo = this.plansService.getRepository();
    const taskRepo = this.tasksService.getRepository();
    const createdInRange = {
      createdAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
    };
    const updatedInRange = {
      updatedAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
    };
    const completedAndUpdatedInRange = {
      status: 'COMPLETED' as const,
      updatedAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)),
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
      planRepo.count({ where: completedAndUpdatedInRange }),
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
      taskRepo.count({ where: completedAndUpdatedInRange }),
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
      date: dateYmd,
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
