import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
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
   * @description Upserts one row for the given date. Atomic single-statement
   * insert-or-update keyed on the unique `date` column, so concurrent writers
   * merge instead of racing a read-then-write (which would surface a 23505
   * unique-violation to the loser).
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
    const rowInput = {
      date,
      plansByStatus: data.plansByStatus,
      plansCompleted: data.plansCompleted,
      plansCreated: data.plansCreated,
      plansUpdated: data.plansUpdated,
      tasksByStatus: data.tasksByStatus,
      tasksCompleted: data.tasksCompleted,
      tasksCreated: data.tasksCreated,
      tasksUpdated: data.tasksUpdated,
    };

    await repo.upsert(rowInput, ['date']);

    const row = repo.create(rowInput);

    return (
      (await repo.findOne({
        where: {
          date: new Date(date),
        },
      })) ?? row
    );
  }
}
