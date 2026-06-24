import { describe, expect, test } from 'vitest';
import {
  deriveOverallHealthStatus,
  formatMetricsSummary,
  healthStatusColorClass,
  healthValueColorClass,
} from '../utils.global';

describe('deriveOverallHealthStatus', () => {
  test('returns ok only when every component is ok', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      }),
    ).toBe('ok');
  });

  test('folds a dead websocket into the overall status (no false online)', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'unreachable',
      }),
    ).toBe('unreachable');
  });

  test('unreachable wins over unconfigured (worst-case)', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'unconfigured',
        redis: 'unreachable',
        websocket: 'ok',
      }),
    ).toBe('unreachable');
  });

  test('unconfigured when any component is unconfigured but none unreachable', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'unconfigured',
        redis: 'ok',
        websocket: 'ok',
      }),
    ).toBe('unconfigured');
  });

  test('treats missing payload as unconfigured (never claims online)', () => {
    expect(deriveOverallHealthStatus(undefined)).toBe('unconfigured');
  });

  test('treats unknown component values as unconfigured', () => {
    expect(
      deriveOverallHealthStatus({
        api: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'definitely-not-a-status',
      }),
    ).toBe('unconfigured');
  });
});

describe('healthStatusColorClass', () => {
  test('maps each status to its dot color', () => {
    expect(healthStatusColorClass('ok')).toBe('bg-green-500');
    expect(healthStatusColorClass('unconfigured')).toBe('bg-amber-500');
    expect(healthStatusColorClass('unreachable')).toBe('bg-red-500');
  });
});

describe('healthValueColorClass', () => {
  test('shares the GlobalFooter mapping for per-component dots', () => {
    expect(healthValueColorClass('ok')).toBe('bg-green-500');
    expect(healthValueColorClass('unreachable')).toBe('bg-red-500');
    expect(healthValueColorClass('unconfigured')).toBe('bg-amber-500');
    expect(healthValueColorClass(undefined)).toBe('bg-amber-500');
  });
});

describe('formatMetricsSummary', () => {
  test('renders an em-dash placeholder when no sample is available', () => {
    expect(formatMetricsSummary(null)).toBe('—');
    expect(formatMetricsSummary(undefined)).toBe('—');
  });

  test('summarizes RSS, heap-used, and CPU-user from the latest sample', () => {
    expect(
      formatMetricsSummary({
        cpuSystemMs: 99,
        cpuUserMs: 12_340.7,
        externalMb: 5,
        heapTotalMb: 200,
        heapUsedMb: 87.456,
        rssMb: 145.219,
      }),
    ).toBe('RSS 145.22 MB · Heap 87.46 MB · CPU 12341 ms');
  });
});
