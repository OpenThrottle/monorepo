import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { Repository } from 'typeorm';
import { DailyStat } from './daily-stat.entity';

@Injectable()
export class DailyStatsService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(DailyStat)
    private readonly dailyStatRepository: Repository<DailyStat>,
  ) {
    this.logger.debug('🧩 daily-stats 🧩');
  }

  /**
   * @description Returns the TypeORM repository for daily_stats. Use for CRUD and upsert.
   */
  getRepository(): Repository<DailyStat> {
    return this.dailyStatRepository;
  }

  /**
   * @description Upserts one row for the given date. Inserts or updates by unique date.
   */
  async upsertForDate(
    date: string,
    data: {
      readonly plansByStatus: Record<string, number>;
      readonly plansCompleted: number;
      readonly plansCreated: number;
      readonly plansUpdated: number;
      readonly tasksByStatus: Record<string, number>;
      readonly tasksCompleted: number;
      readonly tasksCreated: number;
      readonly tasksUpdated: number;
    },
  ): Promise<DailyStat> {
    const repo = this.getRepository();
    const existing = await repo.findOne({
      where: {
        date: new Date(date),
      },
    });

    if (existing) {
      existing.plansByStatus = { ...data.plansByStatus };
      existing.plansCompleted = data.plansCompleted;
      existing.plansCreated = data.plansCreated;
      existing.plansUpdated = data.plansUpdated;
      existing.tasksByStatus = { ...data.tasksByStatus };
      existing.tasksCompleted = data.tasksCompleted;
      existing.tasksCreated = data.tasksCreated;
      existing.tasksUpdated = data.tasksUpdated;
      return repo.save(existing);
    }

    const row = repo.create({
      date,
      plansByStatus: data.plansByStatus,
      plansCompleted: data.plansCompleted,
      plansCreated: data.plansCreated,
      plansUpdated: data.plansUpdated,
      tasksByStatus: data.tasksByStatus,
      tasksCompleted: data.tasksCompleted,
      tasksCreated: data.tasksCreated,
      tasksUpdated: data.tasksUpdated,
    });

    return repo.save(row);
  }
}
