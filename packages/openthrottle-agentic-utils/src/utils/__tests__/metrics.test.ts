import { describe, expect, test } from 'vitest';

import { createWallClockMetrics } from '../metrics.js';

describe('createWallClockMetrics', () => {
  test('computes correct metrics for CPU-bound job (ratio ~1)', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 200,
      cpuUserDeltaMs: 800,
      endTimestamp: 1000,
      startTimestamp: 0,
    });

    expect(metrics.wallClockMs).toBe(1000);
    expect(metrics.cpuUserMs).toBe(800);
    expect(metrics.cpuSystemMs).toBe(200);
    expect(metrics.cpuTimeMs).toBe(1000);
    expect(metrics.wallClockToCpuRatio).toBe(1);
    expect(metrics.interpretation).toBe('cpu_bound');
  });

  test('computes correct metrics for I/O-bound job (ratio > 5)', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 50,
      cpuUserDeltaMs: 150,
      endTimestamp: 10000,
      startTimestamp: 0,
    });

    expect(metrics.wallClockMs).toBe(10000);
    expect(metrics.cpuTimeMs).toBe(200);
    expect(metrics.wallClockToCpuRatio).toBe(50);
    expect(metrics.interpretation).toBe('io_bound');
  });

  test('computes correct metrics for mixed workload (ratio 2-5)', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 100,
      cpuUserDeltaMs: 400,
      endTimestamp: 1500,
      startTimestamp: 0,
    });

    expect(metrics.wallClockMs).toBe(1500);
    expect(metrics.cpuTimeMs).toBe(500);
    expect(metrics.wallClockToCpuRatio).toBe(3);
    expect(metrics.interpretation).toBe('mixed');
  });

  test('handles idle job (zero CPU time)', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 0,
      cpuUserDeltaMs: 0,
      endTimestamp: 5000,
      startTimestamp: 0,
    });

    expect(metrics.wallClockMs).toBe(5000);
    expect(metrics.cpuTimeMs).toBe(0);
    expect(metrics.wallClockToCpuRatio).toBe(Infinity);
    expect(metrics.interpretation).toBe('idle');
  });

  test('handles instant job (zero wall clock and zero CPU)', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 0,
      cpuUserDeltaMs: 0,
      endTimestamp: 1000,
      startTimestamp: 1000,
    });

    expect(metrics.wallClockMs).toBe(0);
    expect(metrics.cpuTimeMs).toBe(0);
    expect(metrics.wallClockToCpuRatio).toBe(1);
    expect(metrics.interpretation).toBe('idle');
  });

  test('rounds ratio to 2 decimal places', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 33,
      cpuUserDeltaMs: 67,
      endTimestamp: 1000,
      startTimestamp: 0,
    });

    expect(metrics.wallClockToCpuRatio).toBe(10);
  });

  test('boundary: ratio exactly 1.5 is cpu_bound', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 100,
      cpuUserDeltaMs: 900,
      endTimestamp: 1500,
      startTimestamp: 0,
    });

    expect(metrics.wallClockToCpuRatio).toBe(1.5);
    expect(metrics.interpretation).toBe('cpu_bound');
  });

  test('boundary: ratio just over 1.5 is mixed', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 100,
      cpuUserDeltaMs: 900,
      endTimestamp: 1510,
      startTimestamp: 0,
    });

    expect(metrics.wallClockToCpuRatio).toBe(1.51);
    expect(metrics.interpretation).toBe('mixed');
  });

  test('boundary: ratio exactly 5 is mixed', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 20,
      cpuUserDeltaMs: 80,
      endTimestamp: 500,
      startTimestamp: 0,
    });

    expect(metrics.wallClockToCpuRatio).toBe(5);
    expect(metrics.interpretation).toBe('mixed');
  });

  test('boundary: ratio just over 5 is io_bound', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 20,
      cpuUserDeltaMs: 80,
      endTimestamp: 510,
      startTimestamp: 0,
    });

    expect(metrics.wallClockToCpuRatio).toBe(5.1);
    expect(metrics.interpretation).toBe('io_bound');
  });

  test('preserves timestamps', () => {
    const metrics = createWallClockMetrics({
      cpuSystemDeltaMs: 100,
      cpuUserDeltaMs: 400,
      endTimestamp: 1706000005000,
      startTimestamp: 1706000000000,
    });

    expect(metrics.startTimestamp).toBe(1706000000000);
    expect(metrics.endTimestamp).toBe(1706000005000);
  });
});
