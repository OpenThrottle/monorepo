import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { DailyStat } from './daily-stat.entity.ts';
import type { DailyStatsRepositoryMock } from './daily-stats.types.ts';

/**
 * @description Builds a {@link DailyStatsRepositoryMock} that starts as an empty
 * `daily_stats` table (see `createBaseRepositoryMock`). `upsertForDate` rejects until a
 * test stubs it, since an invented row would hide a missing stub. Provide it in place of
 * `DailyStatsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createDailyStatsRepositoryMock(): DailyStatsRepositoryMock {
  return {
    ...createBaseRepositoryMock<DailyStat, CreateModelInput<DailyStat>>(
      'daily_stats',
    ),
    findByDate: vi.fn(async () => {
      return null;
    }),
    findInRange: vi.fn(async () => {
      return [];
    }),
    getExistingDatesInRange: vi.fn(async () => {
      return new Set<string>();
    }),
    getLatestDate: vi.fn(async () => {
      return null;
    }),
    upsertForDate: vi.fn(() => {
      return Promise.reject(
        new Error('daily_stats.upsertForDate is not stubbed in this test'),
      );
    }),
  };
}
