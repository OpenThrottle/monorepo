import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY,
  GLOBAL_METRICS_CHART_MAX_SAMPLES,
  readStoredMetricsChartHistory,
  trimMetricsChartData,
  writeStoredMetricsChartHistory,
  type MetricsChartDatum,
} from '../global-metrics-chart-history-storage';

const sample = (i: number): MetricsChartDatum => ({
  cpuSystemMs: 1,
  cpuUserMs: 2,
  externalMb: 3,
  heapTotalMb: 4,
  heapUsedMb: 5,
  i,
  rssMb: 6 + i,
});

describe('global-metrics-chart-history-storage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-02T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  test('readStoredMetricsChartHistory returns empty when key is absent', () => {
    expect(readStoredMetricsChartHistory()).toEqual([]);
  });

  test('writeStoredMetricsChartHistory then read returns trimmed valid samples', () => {
    const rows: MetricsChartDatum[] = [sample(0), sample(1)];
    writeStoredMetricsChartHistory(rows);
    const restored = readStoredMetricsChartHistory();
    expect(restored).toHaveLength(2);
    expect(restored[0]?.i).toBe(0);
    expect(restored[1]?.i).toBe(1);
    expect(restored[1]?.rssMb).toBe(7);
  });

  test('readStoredMetricsChartHistory ignores corrupt JSON', () => {
    sessionStorage.setItem(
      GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY,
      'not-json{',
    );
    expect(readStoredMetricsChartHistory()).toEqual([]);
  });

  test('readStoredMetricsChartHistory ignores wrong schema version', () => {
    sessionStorage.setItem(
      GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY,
      JSON.stringify({
        samples: [sample(0)],
        savedAt: Date.now(),
        v: 99,
      }),
    );
    expect(readStoredMetricsChartHistory()).toEqual([]);
  });

  test('readStoredMetricsChartHistory ignores expired payloads by savedAt', () => {
    const savedAt = Date.now() - 1000 * 60 * 60 * 25;
    sessionStorage.setItem(
      GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY,
      JSON.stringify({
        samples: [sample(0)],
        savedAt,
        v: 1,
      }),
    );
    expect(readStoredMetricsChartHistory()).toEqual([]);
    expect(readStoredMetricsChartHistory(Number.MAX_SAFE_INTEGER)).toHaveLength(
      1,
    );
  });

  test('readStoredMetricsChartHistory rejects rows with invalid metrics', () => {
    sessionStorage.setItem(
      GLOBAL_METRICS_CHART_HISTORY_STORAGE_KEY,
      JSON.stringify({
        samples: [{ ...sample(0), rssMb: 'nope' }],
        savedAt: Date.now(),
        v: 1,
      }),
    );
    expect(readStoredMetricsChartHistory()).toEqual([]);
  });

  test('trimMetricsChartData keeps tail and reindexes', () => {
    const many = Array.from(
      { length: GLOBAL_METRICS_CHART_MAX_SAMPLES + 5 },
      (_, j) => sample(j),
    );
    const trimmed = trimMetricsChartData(many);
    expect(trimmed).toHaveLength(GLOBAL_METRICS_CHART_MAX_SAMPLES);
    expect(trimmed[0]?.rssMb).toBe(6 + 5);
    expect(trimmed[GLOBAL_METRICS_CHART_MAX_SAMPLES - 1]?.i).toBe(
      GLOBAL_METRICS_CHART_MAX_SAMPLES - 1,
    );
  });

  test('writeStoredMetricsChartHistory swallows setItem errors', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota');
      });
    expect(() => writeStoredMetricsChartHistory([sample(0)])).not.toThrow();
    spy.mockRestore();
  });
});
