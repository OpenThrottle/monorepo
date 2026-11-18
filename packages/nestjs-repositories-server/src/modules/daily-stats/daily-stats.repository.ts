import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import { Repository } from 'typeorm';

import { DailyStat } from './daily-stat.entity.ts';
import type { DailyStatCounts } from './daily-stats.types.ts';

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

/**
 * @description Data access for the openthrottle `daily_stats` table on the default
 * connection: the `BaseRepository` CRUD (hard deletes, since the rows are derived) plus
 * the date-keyed reads and the upsert the daily-stats queue and resolver use. Dates are
 * UTC `YYYY-MM-DD` strings throughout.
 * @public
 */
@Injectable()
export class DailyStatsRepository extends BaseRepository<
  DailyStat,
  CreateModelInput<DailyStat>
> {
  protected readonly tableName = 'daily_stats';

  constructor(
    @InjectRepository(DailyStat)
    repository: Repository<DailyStat>,
  ) {
    super(repository);
  }

  /**
   * @description The row for one date, or null when that date has none.
   */
  async findByDate(date: string): Promise<DailyStat | null> {
    return this.findOne({ where: { date: new Date(date) } });
  }

  /**
   * @description Every row in the inclusive `[startYmd, endYmd]` window, oldest first.
   * Unbounded on purpose: a window is at most a few hundred days.
   */
  async findInRange(startYmd: string, endYmd: string): Promise<DailyStat[]> {
    return this.repository
      .createQueryBuilder('d')
      .where('d.date >= :start', { start: startYmd })
      .andWhere('d.date <= :end', { end: endYmd })
      .orderBy('d.date', 'ASC')
      .getMany();
  }

  /**
   * @description Returns the most recent `date` present in daily_stats as a UTC
   * `YYYY-MM-DD` string, or null when the table is empty. Used by the processor
   * to find the floor of a catch-up backfill window.
   */
  async getLatestDate(): Promise<string | null> {
    const row = await this.repository
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
    const rows = await this.repository
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
  async upsertForDate(date: string, data: DailyStatCounts): Promise<DailyStat> {
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

    await this.repository.upsert(rowInput, ['date']);

    const row = this.repository.create(rowInput);

    return (await this.findByDate(date)) ?? row;
  }
}
