import { describe, expect, test } from 'vitest';
import {
  parseSelectedStatDate,
  resolveDateFromActiveIndex,
  selectDailyStatByDate,
  selectMostRecentDailyStat,
  shiftIsoDate,
} from '../daily-stats-selection';
import type { DashboardDailyStatsCardFragment } from '~/__generated__/graphql';

const stats: ReadonlyArray<DashboardDailyStatsCardFragment> = [
  {
    date: '2026-01-01',
    plansCompleted: 1,
    plansCreated: 2,
    plansUpdated: 0,
    tasksCompleted: 1,
    tasksCreated: 3,
    tasksUpdated: 1,
  },
  {
    date: '2026-01-03',
    plansCompleted: 0,
    plansCreated: 1,
    plansUpdated: 1,
    tasksCompleted: 2,
    tasksCreated: 0,
    tasksUpdated: 0,
  },
  {
    date: '2026-01-02',
    plansCompleted: 4,
    plansCreated: 4,
    plansUpdated: 4,
    tasksCompleted: 4,
    tasksCreated: 4,
    tasksUpdated: 4,
  },
];

describe('parseSelectedStatDate', () => {
  test('should return the date param when present', () => {
    expect(parseSelectedStatDate(new URLSearchParams('date=2026-01-02'))).toBe(
      '2026-01-02',
    );
  });

  test('should return null when the param is missing', () => {
    expect(parseSelectedStatDate(new URLSearchParams())).toBeNull();
  });

  test('should return null when the param is empty', () => {
    expect(parseSelectedStatDate(new URLSearchParams('date='))).toBeNull();
  });
});

describe('selectDailyStatByDate', () => {
  test('should return the row matching the date', () => {
    expect(selectDailyStatByDate(stats, '2026-01-03')).toBe(stats[1]);
  });

  test('should return null when the date is null', () => {
    expect(selectDailyStatByDate(stats, null)).toBeNull();
  });

  test('should return null when no row matches', () => {
    expect(selectDailyStatByDate(stats, '2030-12-31')).toBeNull();
  });
});

describe('selectMostRecentDailyStat', () => {
  test('should return the row with the latest date', () => {
    expect(selectMostRecentDailyStat(stats)).toBe(stats[1]);
  });

  test('should return null for an empty range', () => {
    expect(selectMostRecentDailyStat([])).toBeNull();
  });
});

describe('shiftIsoDate', () => {
  test('should step forward by one day', () => {
    expect(shiftIsoDate('2026-01-01', 1)).toBe('2026-01-02');
  });

  test('should step backward by one day', () => {
    expect(shiftIsoDate('2026-01-01', -1)).toBe('2025-12-31');
  });

  test('should roll across month boundaries', () => {
    expect(shiftIsoDate('2026-01-31', 1)).toBe('2026-02-01');
  });

  test('should handle leap days', () => {
    expect(shiftIsoDate('2024-02-28', 1)).toBe('2024-02-29');
  });

  test('should return the input unchanged when it is not a YYYY-MM-DD value', () => {
    expect(shiftIsoDate('not-a-date', 1)).toBe('not-a-date');
  });
});

describe('resolveDateFromActiveIndex', () => {
  test('should return the date at the active index', () => {
    expect(resolveDateFromActiveIndex(stats, 0)).toBe('2026-01-01');
    expect(resolveDateFromActiveIndex(stats, 2)).toBe('2026-01-02');
  });

  test('should accept a string index', () => {
    expect(resolveDateFromActiveIndex(stats, '1')).toBe('2026-01-03');
  });

  test('should return null for null/undefined index', () => {
    expect(resolveDateFromActiveIndex(stats, null)).toBeNull();
    expect(resolveDateFromActiveIndex(stats, undefined)).toBeNull();
  });

  test('should return null for an out-of-range index', () => {
    expect(resolveDateFromActiveIndex(stats, 99)).toBeNull();
  });
});
