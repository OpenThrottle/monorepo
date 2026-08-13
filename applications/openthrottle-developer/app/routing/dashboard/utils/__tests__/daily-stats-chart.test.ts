import { describe, expect, test } from 'vitest';
import { formatChartDate, mapToChartData } from '../daily-stats-chart';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

describe('formatChartDate', () => {
  test('formats a YYYY-MM-DD value as a full US date', () => {
    expect(formatChartDate('2026-02-11')).toBe(
      new Date('2026-02-11T00:00:00').toLocaleDateString('en-US', {
        dateStyle: 'full',
      }),
    );
  });

  test('returns the raw value when it does not parse to a valid date', () => {
    expect(formatChartDate('not-a-date')).toBe('not-a-date');
  });
});

describe('mapToChartData', () => {
  test('maps fragment fields onto chart datum shape', () => {
    const items: DashboardDailyStatsCardFragment[] = [
      {
        __typename: 'DailyStatsObject',
        date: '2026-02-11',
        plansCompleted: 1,
        plansCreated: 2,
        plansUpdated: 3,
        tasksCompleted: 4,
        tasksCreated: 5,
        tasksUpdated: 6,
      },
    ];

    expect(mapToChartData(items)).toEqual([
      {
        date: '2026-02-11',
        plansCompleted: 1,
        plansCreated: 2,
        plansUpdated: 3,
        tasksCompleted: 4,
        tasksCreated: 5,
        tasksUpdated: 6,
      },
    ]);
  });

  test('returns an empty array for an empty input', () => {
    expect(mapToChartData([])).toEqual([]);
  });
});
