import { describe, expect, test } from 'vitest';
import { USAGE_DAILY_STATS_SERIES } from '../daily-stats-series-glossary';

describe('daily-stats-series-glossary', () => {
  test('lists all six series keys used in daily stats chart', () => {
    const keys = USAGE_DAILY_STATS_SERIES.map((r) => r.seriesKey).sort();
    expect(keys).toEqual([
      'plansCompleted',
      'plansCreated',
      'plansUpdated',
      'tasksCompleted',
      'tasksCreated',
      'tasksUpdated',
    ]);
  });

  test('each entry has a non-empty label and description', () => {
    for (const row of USAGE_DAILY_STATS_SERIES) {
      expect(row.label.length).toBeGreaterThan(0);
      expect(row.description.length).toBeGreaterThan(0);
    }
  });
});
