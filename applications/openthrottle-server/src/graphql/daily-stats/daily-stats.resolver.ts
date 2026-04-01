/**
 * @description Resolver for daily stats: single date and date range. Uses DailyStatsService from @openthrottle/nestjs-repositories.
 */

import { DailyStatsService } from '@openthrottle/nestjs-repositories';
import { Args, Query, Resolver } from '@nestjs/graphql';
import {
  DailyStatsObject,
  DailyStatsRangeResultObject,
} from './daily-stats.object';

function toDailyStatsObject(row: {
  date: Date;
  plansCreated: number;
  plansCompleted: number;
  plansUpdated: number;
  tasksCreated: number;
  tasksCompleted: number;
  tasksUpdated: number;
  plansByStatus: Record<string, number>;
  tasksByStatus: Record<string, number>;
  createdAt: Date;
}): DailyStatsObject {
  const obj = new DailyStatsObject();

  obj.date = new Date(row.date).toISOString().slice(0, 10);
  obj.plansCreated = row.plansCreated;
  obj.plansCompleted = row.plansCompleted;
  obj.plansUpdated = row.plansUpdated;
  obj.tasksCreated = row.tasksCreated;
  obj.tasksCompleted = row.tasksCompleted;
  obj.tasksUpdated = row.tasksUpdated;
  obj.plansByStatusJson = JSON.stringify(row.plansByStatus ?? {});
  obj.tasksByStatusJson = JSON.stringify(row.tasksByStatus ?? {});
  obj.createdAt = row.createdAt;

  return obj;
}

@Resolver()
export class DailyStatsResolver {
  constructor(private readonly dailyStatsService: DailyStatsService) {}

  @Query(() => DailyStatsObject, {
    description: `Aggregated plan and task stats for a single date (YYYY-MM-DD). Returns null if no row for that date.`,
    nullable: true,
  })
  async dailyStats(
    @Args('date', { description: 'Date in YYYY-MM-DD format' })
    date: string,
  ): Promise<DailyStatsObject | null> {
    const repo = this.dailyStatsService.getRepository();
    const row = await repo.findOne({ where: { date: new Date(date) } });

    if (!row) return null;

    return toDailyStatsObject(row);
  }

  @Query(() => DailyStatsRangeResultObject, {
    description: `Aggregated plan and task stats for a date range (start and end inclusive, YYYY-MM-DD).`,
  })
  async dailyStatsRange(
    @Args('start', { description: 'Start date (inclusive), YYYY-MM-DD' })
    start: string,
    @Args('end', { description: 'End date (inclusive), YYYY-MM-DD' })
    end: string,
  ): Promise<DailyStatsRangeResultObject> {
    const repo = this.dailyStatsService.getRepository();
    const qb = repo
      .createQueryBuilder('d')
      .where('d.date >= :start', { start })
      .andWhere('d.date <= :end', { end })
      .orderBy('d.date', 'ASC');

    const rows = await qb.getMany();
    const result = new DailyStatsRangeResultObject();

    result.items = rows.map(toDailyStatsObject);

    return result;
  }
}
