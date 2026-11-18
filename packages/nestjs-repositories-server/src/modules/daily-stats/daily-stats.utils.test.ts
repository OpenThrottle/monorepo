import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createDailyStatsRepositoryMock } from './daily-stats.utils.ts';

describe('createDailyStatsRepositoryMock', () => {
  it('starts as an empty daily_stats table', async () => {
    const repository = createDailyStatsRepositoryMock();

    await expect(repository.findByDate('2026-02-01')).resolves.toBeNull();
    await expect(
      repository.findInRange('2026-02-01', '2026-02-02'),
    ).resolves.toEqual([]);
    await expect(repository.getLatestDate()).resolves.toBeNull();
    await expect(
      repository.getExistingDatesInRange('2026-02-01', '2026-02-02'),
    ).resolves.toEqual(new Set());
  });

  it('rejects upsertForDate until a test stubs it', async () => {
    const repository = createDailyStatsRepositoryMock();

    await expect(
      repository.upsertForDate('2026-02-01', {
        plansByStatus: {},
        plansCompleted: 0,
        plansCreated: 0,
        plansUpdated: 0,
        tasksByStatus: {},
        tasksCompleted: 0,
        tasksCreated: 0,
        tasksUpdated: 0,
      }),
    ).rejects.toThrow('daily_stats.upsertForDate is not stubbed in this test');
  });

  it('names the daily_stats table in inherited not-found errors', async () => {
    const repository = createDailyStatsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'daily_stats record with ID "a" not found',
    );
  });
});
