import { describe, expect, test } from 'vitest';
import {
  mapDailyStatsToContributions,
  sumDailyStatActivity,
} from '~/routing/dashboard/utils/contributions-heatmap';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

const dailyStat = (
  overrides: Partial<DashboardDailyStatsCardFragment> & { date: string },
): DashboardDailyStatsCardFragment => ({
  __typename: 'DailyStatsObject',
  plansCompleted: 0,
  plansCreated: 0,
  plansUpdated: 0,
  tasksCompleted: 0,
  tasksCreated: 0,
  tasksUpdated: 0,
  ...overrides,
});

describe('sumDailyStatActivity', () => {
  test('sums all six plan and task counts', () => {
    expect(
      sumDailyStatActivity(
        dailyStat({
          date: '2026-01-31',
          plansCompleted: 1,
          plansCreated: 2,
          plansUpdated: 3,
          tasksCompleted: 4,
          tasksCreated: 5,
          tasksUpdated: 6,
        }),
      ),
    ).toBe(21);
  });
});

describe('mapDailyStatsToContributions', () => {
  test('maps each row to { date, count } with count = total activity', () => {
    expect(
      mapDailyStatsToContributions([
        dailyStat({ date: '2026-01-30', plansCreated: 2, tasksCompleted: 1 }),
        dailyStat({ date: '2026-01-31' }),
      ]),
    ).toEqual([
      { count: 3, date: '2026-01-30' },
      { count: 0, date: '2026-01-31' },
    ]);
  });
});
