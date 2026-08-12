import { beforeEach, describe, expect, test, vi } from 'vitest';
import { APP_NAME } from '@openthrottle/react-router-utils';
import {
  GLOBAL_METRICS_COLLAPSED_KEY,
  GLOBAL_METRICS_STORAGE_KEY,
} from '../../config';
import {
  getStoredMetricsCollapsed,
  getStoredPollIntervalMs,
  readStoredMetricsChartHistory,
  trimMetricsChartData,
  writeStoredMetricsChartHistory,
  writeStoredMetricsCollapsed,
} from '../storage';
import type { MetricsChartDatum } from '../storage';

const CHART_HISTORY_STORAGE_KEY = `${APP_NAME}:global-metrics:v1`;

const sample: MetricsChartDatum = {
  cpuSystemMs: 1,
  cpuUserMs: 2,
  externalMb: 3,
  heapTotalMb: 4,
  heapUsedMb: 5,
  i: 0,
  rssMb: 6,
};

describe('getStoredPollIntervalMs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns null when nothing is stored', () => {
    expect(getStoredPollIntervalMs()).toBeNull();
  });

  test('returns the stored interval when it is a valid preset', () => {
    localStorage.setItem(GLOBAL_METRICS_STORAGE_KEY, '15000');
    expect(getStoredPollIntervalMs()).toBe(15_000);
  });

  test('returns null when the stored value is not a valid preset', () => {
    localStorage.setItem(GLOBAL_METRICS_STORAGE_KEY, '999');
    expect(getStoredPollIntervalMs()).toBeNull();
  });

  test('returns null when the stored value is not a number', () => {
    localStorage.setItem(GLOBAL_METRICS_STORAGE_KEY, 'not-a-number');
    expect(getStoredPollIntervalMs()).toBeNull();
  });
});

describe('getStoredMetricsCollapsed / writeStoredMetricsCollapsed', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('returns null when nothing is stored', () => {
    expect(getStoredMetricsCollapsed()).toBeNull();
  });

  test('round-trips true through sessionStorage', () => {
    writeStoredMetricsCollapsed(true);
    expect(sessionStorage.getItem(GLOBAL_METRICS_COLLAPSED_KEY)).toBe('true');
    expect(getStoredMetricsCollapsed()).toBe(true);
  });

  test('round-trips false through sessionStorage', () => {
    writeStoredMetricsCollapsed(false);
    expect(sessionStorage.getItem(GLOBAL_METRICS_COLLAPSED_KEY)).toBe('false');
    expect(getStoredMetricsCollapsed()).toBe(false);
  });

  test('returns null for an unparseable stored value', () => {
    sessionStorage.setItem(GLOBAL_METRICS_COLLAPSED_KEY, 'garbage');
    expect(getStoredMetricsCollapsed()).toBeNull();
  });
});

describe('trimMetricsChartData', () => {
  test('reindexes i from 0 when already within the max size', () => {
    const rows: MetricsChartDatum[] = [
      { ...sample, i: 5 },
      { ...sample, i: 6 },
    ];

    expect(trimMetricsChartData(rows)).toEqual([
      { ...sample, i: 0 },
      { ...sample, i: 1 },
    ]);
  });

  test('keeps only the most recent 25 samples', () => {
    const rows: MetricsChartDatum[] = Array.from({ length: 30 }, (_, idx) => ({
      ...sample,
      i: idx,
      rssMb: idx,
    }));

    const trimmed = trimMetricsChartData(rows);

    expect(trimmed).toHaveLength(25);
    expect(trimmed[0].rssMb).toBe(5);
    expect(trimmed[trimmed.length - 1].rssMb).toBe(29);
    expect(trimmed[0].i).toBe(0);
    expect(trimmed[trimmed.length - 1].i).toBe(24);
  });
});

describe('readStoredMetricsChartHistory / writeStoredMetricsChartHistory', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  test('returns an empty array when nothing is stored', () => {
    expect(readStoredMetricsChartHistory()).toEqual([]);
  });

  test('round-trips a written sample list', () => {
    writeStoredMetricsChartHistory([sample]);
    expect(readStoredMetricsChartHistory()).toEqual([sample]);
  });

  test('trims the persisted samples to the max sample count', () => {
    const rows: MetricsChartDatum[] = Array.from({ length: 30 }, (_, idx) => ({
      ...sample,
      i: idx,
    }));

    writeStoredMetricsChartHistory(rows);

    expect(readStoredMetricsChartHistory()).toHaveLength(25);
  });

  test('returns an empty array for corrupt JSON', () => {
    sessionStorage.setItem(CHART_HISTORY_STORAGE_KEY, '{not valid json');

    expect(readStoredMetricsChartHistory()).toEqual([]);
  });

  test('returns an empty array for an expired payload (maxAgeMs)', () => {
    writeStoredMetricsChartHistory([sample]);

    expect(readStoredMetricsChartHistory(-1)).toEqual([]);
  });

  test('returns an empty array when the schema version does not match', () => {
    sessionStorage.setItem(
      CHART_HISTORY_STORAGE_KEY,
      JSON.stringify({ samples: [sample], savedAt: Date.now(), v: 2 }),
    );

    expect(readStoredMetricsChartHistory()).toEqual([]);
  });
});
