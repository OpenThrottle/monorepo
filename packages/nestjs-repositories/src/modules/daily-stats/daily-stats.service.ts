import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { DailyStat } from './daily-stat.entity';

/**
 * @description Normalizes a Postgres `date` value (pg returns `YYYY-MM-DD`
 * strings; TypeORM may hand back a `Date`) to a UTC `YYYY-MM-DD` string.
 */
function normalizeYmd(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

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
   * @description Returns the most recent `date` present in daily_stats as a UTC
   * `YYYY-MM-DD` string, or null when the table is empty. Used by the processor
   * to find the floor of a catch-up backfill window.
   */
  async getLatestDate(): Promise<string | null> {
    const row = await this.dailyStatRepository
      .createQueryBuilder('ds')
      .select('ds.date', 'date')
      .orderBy('ds.date', 'DESC')
      .limit(1)
      .getRawOne<{ date: Date | string }>();

    return row ? normalizeYmd(row.date) : null;
  }

  /**
   * @description Returns the set of `date`s already present in daily_stats within
   * the inclusive `[startYmd, endYmd]` window, as UTC `YYYY-MM-DD` strings. Used
   * for gap detection so only missing days are recomputed.
   */
  async getExistingDatesInRange(
    startYmd: string,
    endYmd: string,
  ): Promise<Set<string>> {
    const rows = await this.dailyStatRepository
      .createQueryBuilder('ds')
      .select('ds.date', 'date')
      .where('ds.date >= :startYmd AND ds.date <= :endYmd', {
        endYmd,
        startYmd,
      })
      .getRawMany<{ date: Date | string }>();

    return new Set(rows.map((row) => normalizeYmd(row.date)));
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
