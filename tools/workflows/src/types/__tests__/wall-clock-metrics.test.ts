import { describe, expect, test } from 'vitest';
import { formatWallClockMetrics } from '../wall-clock-metrics';
import type { WallClockMetrics } from '../wall-clock-metrics';

describe('formatWallClockMetrics', () => {
  test('formats CPU-bound metrics correctly', () => {
    const metrics: WallClockMetrics = {
      cpuSystemMs: 200,
      cpuTimeMs: 1000,
      cpuUserMs: 800,
      endTimestamp: 1000,
      interpretation: 'cpu_bound',
      startTimestamp: 0,
      wallClockMs: 1000,
      wallClockToCpuRatio: 1,
    };

    const formatted = formatWallClockMetrics(metrics);
    expect(formatted).toBe(
      'Wall clock: 1.0s, CPU: 1.0s (user: 0.8s, sys: 0.2s), ratio: 1.00x (cpu_bound)',
    );
  });

  test('formats I/O-bound metrics correctly', () => {
    const metrics: WallClockMetrics = {
      cpuSystemMs: 50,
      cpuTimeMs: 200,
      cpuUserMs: 150,
      endTimestamp: 10000,
      interpretation: 'io_bound',
      startTimestamp: 0,
      wallClockMs: 10000,
      wallClockToCpuRatio: 50,
    };

    const formatted = formatWallClockMetrics(metrics);
    expect(formatted).toBe(
      'Wall clock: 10.0s, CPU: 0.2s (user: 0.1s, sys: 0.1s), ratio: 50.00x (io_bound)',
    );
  });

  test('formats idle metrics with infinity symbol', () => {
    const metrics: WallClockMetrics = {
      cpuSystemMs: 0,
      cpuTimeMs: 0,
      cpuUserMs: 0,
      endTimestamp: 5000,
      interpretation: 'idle',
      startTimestamp: 0,
      wallClockMs: 5000,
      wallClockToCpuRatio: Infinity,
    };

    const formatted = formatWallClockMetrics(metrics);
    expect(formatted).toBe(
      'Wall clock: 5.0s, CPU: 0.0s (user: 0.0s, sys: 0.0s), ratio: ∞x (idle)',
    );
  });

  test('formats mixed metrics correctly', () => {
    const metrics: WallClockMetrics = {
      cpuSystemMs: 100,
      cpuTimeMs: 500,
      cpuUserMs: 400,
      endTimestamp: 1500,
      interpretation: 'mixed',
      startTimestamp: 0,
      wallClockMs: 1500,
      wallClockToCpuRatio: 3,
    };

    const formatted = formatWallClockMetrics(metrics);
    expect(formatted).toBe(
      'Wall clock: 1.5s, CPU: 0.5s (user: 0.4s, sys: 0.1s), ratio: 3.00x (mixed)',
    );
  });
});
