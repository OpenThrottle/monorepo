import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { DailyStat } from './daily-stat.entity.ts';
import type { DailyStatsRepository } from './daily-stats.repository.ts';

/**
 * @description The counts {@link DailyStatsRepository.upsertForDate} writes for one date.
 * @public
 */
export interface DailyStatCounts {
  readonly plansByStatus: Record<string, number>;
  readonly plansCompleted: number;
  readonly plansCreated: number;
  readonly plansUpdated: number;
  readonly tasksByStatus: Record<string, number>;
  readonly tasksCompleted: number;
  readonly tasksCreated: number;
  readonly tasksUpdated: number;
}

/**
 * @description A {@link DailyStatsRepository} mock: every inherited `BaseRepository`
 * method plus the daily-stats ones.
 * @public
 */
export interface DailyStatsRepositoryMock extends BaseRepositoryMock<
  DailyStat,
  CreateModelInput<DailyStat>
> {
  readonly findByDate: Mock<DailyStatsRepository['findByDate']>;
  readonly findInRange: Mock<DailyStatsRepository['findInRange']>;
  readonly getExistingDatesInRange: Mock<
    DailyStatsRepository['getExistingDatesInRange']
  >;
  readonly getLatestDate: Mock<DailyStatsRepository['getLatestDate']>;
  readonly upsertForDate: Mock<DailyStatsRepository['upsertForDate']>;
}
