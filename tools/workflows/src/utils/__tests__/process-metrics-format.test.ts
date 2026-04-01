import { describe, expect, test } from 'vitest';
import type { ChildProcessMetrics } from '../../types/child-process-metrics';
import type { SystemCpuMetrics } from '../../types/system-cpu-metrics';
import type { WallClockMetrics } from '../../types/wall-clock-metrics';
import {
  characterizeWorkload,
  formatChildProcessMetrics,
  formatTaskRunMetricsDetailed,
  formatTaskRunMetricsSummary,
} from '../process-metrics-format';
import type { TaskRunMetrics } from '../process-metrics-format';

const createMockChildProcessMetrics = (
  overrides: Partial<ChildProcessMetrics> = {},
): ChildProcessMetrics => ({
  avgCpuPercent: 42.5,
  avgRssMb: 256,
  peakCpuPercent: 85.3,
  peakRssMb: 512,
  pid: 12345,
  pollIntervalMs: 5000,
  sampleCount: 15,
  ...overrides,
});

const createMockWallClockMetrics = (
  overrides: Partial<WallClockMetrics> = {},
): WallClockMetrics => ({
  cpuSystemMs: 200,
  cpuTimeMs: 1000,
  cpuUserMs: 800,
  endTimestamp: 46000,
  interpretation: 'cpu_bound',
  startTimestamp: 1000,
  wallClockMs: 45000,
  wallClockToCpuRatio: 1.2,
  ...overrides,
});

const createMockSystemCpuMetrics = (
  overrides: Partial<SystemCpuMetrics> = {},
): SystemCpuMetrics => ({
  atEnd: {
    loadAverage: {
      cpuCount: 8,
      load15m: 1.5,
      load1m: 2.1,
      load5m: 1.8,
      perCoreLoad1m: 0.26,
    },
    psi: {
      full10s: null,
      full300s: null,
      full60s: null,
      fullTotalUs: null,
      some10s: 2.5,
      some300s: 1.2,
      some60s: 1.8,
      someTotalUs: 150000,
    },
    timestamp: 46000,
  },
  atStart: {
    loadAverage: {
      cpuCount: 8,
      load15m: 1.4,
      load1m: 1.8,
      load5m: 1.6,
      perCoreLoad1m: 0.23,
    },
    psi: {
      full10s: null,
      full300s: null,
      full60s: null,
      fullTotalUs: null,
      some10s: 2.0,
      some300s: 1.1,
      some60s: 1.5,
      someTotalUs: 100000,
    },
    timestamp: 1000,
  },
  platform: 'linux',
  pressureLevel: 'low',
  psiAvailable: true,
  psiFullDeltaUs: null,
  psiSomeDeltaUs: 50000,
  ...overrides,
});

describe('formatChildProcessMetrics', () => {
  test('formats child process metrics with all fields', () => {
    const metrics = createMockChildProcessMetrics();
    const formatted = formatChildProcessMetrics(metrics);

    expect(formatted).toContain('peak 85.3% CPU');
    expect(formatted).toContain('avg 42.5% CPU');
    expect(formatted).toContain('peak 512MB RSS');
    expect(formatted).toContain('avg 256MB RSS');
    expect(formatted).toContain('15 samples');
  });

  test('formats metrics with zero samples', () => {
    const metrics = createMockChildProcessMetrics({
      avgCpuPercent: 0,
      avgRssMb: 0,
      peakCpuPercent: 0,
      peakRssMb: 0,
      sampleCount: 0,
    });
    const formatted = formatChildProcessMetrics(metrics);

    expect(formatted).toContain('peak 0.0% CPU');
    expect(formatted).toContain('0 samples');
  });

  test('formats metrics with high CPU percentages (>100%)', () => {
    const metrics = createMockChildProcessMetrics({
      avgCpuPercent: 180.5,
      peakCpuPercent: 350.2,
    });
    const formatted = formatChildProcessMetrics(metrics);

    expect(formatted).toContain('peak 350.2% CPU');
    expect(formatted).toContain('avg 180.5% CPU');
  });
});

describe('formatTaskRunMetricsSummary', () => {
  test('formats summary with all metrics', () => {
    const metrics: TaskRunMetrics = {
      childProcessMetrics: createMockChildProcessMetrics(),
      systemCpuMetrics: createMockSystemCpuMetrics(),
      wallClockMetrics: createMockWallClockMetrics(),
    };

    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).toMatch(/^Metrics:/);
    expect(summary).toContain('45.0s wall');
    expect(summary).toContain('child peak 85%');
    expect(summary).toContain('ratio 1.2x (cpu_bound)');
    expect(summary).toContain('load 0.3/core (low)');
  });

  test('formats summary with only wall-clock metrics', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics(),
    };

    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).toMatch(/^Metrics:/);
    expect(summary).toContain('45.0s wall');
    expect(summary).toContain('ratio 1.2x (cpu_bound)');
    expect(summary).not.toContain('child peak');
    expect(summary).not.toContain('load');
  });

  test('formats summary with no metrics', () => {
    const metrics: TaskRunMetrics = {};

    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).toBe('Metrics: (no data)');
  });

  test('skips child metrics when sampleCount is 0', () => {
    const metrics: TaskRunMetrics = {
      childProcessMetrics: createMockChildProcessMetrics({ sampleCount: 0 }),
      wallClockMetrics: createMockWallClockMetrics(),
    };

    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).not.toContain('child peak');
    expect(summary).toContain('ratio');
  });

  test('handles infinite wall-clock ratio', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'idle',
        wallClockToCpuRatio: Infinity,
      }),
    };

    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).toContain('ratio ∞x (idle)');
  });

  test('formats high system load correctly', () => {
    const metrics: TaskRunMetrics = {
      systemCpuMetrics: createMockSystemCpuMetrics({
        atEnd: {
          loadAverage: {
            cpuCount: 4,
            load15m: 8.0,
            load1m: 12.5,
            load5m: 10.2,
            perCoreLoad1m: 3.12,
          },
          psi: {
            full10s: null,
            full300s: null,
            full60s: null,
            fullTotalUs: null,
            some10s: 25.0,
            some300s: 15.0,
            some60s: 20.0,
            someTotalUs: 500000,
          },
          timestamp: 46000,
        },
        pressureLevel: 'high',
      }),
      wallClockMetrics: createMockWallClockMetrics(),
    };

    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).toContain('load 3.1/core (high)');
  });
});

describe('characterizeWorkload', () => {
  test('returns cpu_bound when wall-clock interpretation is cpu_bound', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'cpu_bound',
      }),
    };

    expect(characterizeWorkload(metrics)).toBe('cpu_bound');
  });

  test('returns io_bound when wall-clock interpretation is io_bound', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'io_bound',
      }),
    };

    expect(characterizeWorkload(metrics)).toBe('io_bound');
  });

  test('returns mixed when wall-clock interpretation is mixed', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'mixed',
      }),
    };

    expect(characterizeWorkload(metrics)).toBe('mixed');
  });

  test('returns idle when wall-clock interpretation is idle', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'idle',
      }),
    };

    expect(characterizeWorkload(metrics)).toBe('idle');
  });

  test('returns system_contention when system pressure is high but child CPU is low', () => {
    const metrics: TaskRunMetrics = {
      childProcessMetrics: createMockChildProcessMetrics({
        peakCpuPercent: 25,
      }),
      systemCpuMetrics: createMockSystemCpuMetrics({
        pressureLevel: 'high',
      }),
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'mixed',
      }),
    };

    expect(characterizeWorkload(metrics)).toBe('system_contention');
  });

  test('returns original interpretation when system pressure is high but child CPU is also high', () => {
    const metrics: TaskRunMetrics = {
      childProcessMetrics: createMockChildProcessMetrics({
        peakCpuPercent: 150,
      }),
      systemCpuMetrics: createMockSystemCpuMetrics({
        pressureLevel: 'high',
      }),
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'cpu_bound',
      }),
    };

    expect(characterizeWorkload(metrics)).toBe('cpu_bound');
  });

  test('returns unknown when no wall-clock metrics provided', () => {
    const metrics: TaskRunMetrics = {
      childProcessMetrics: createMockChildProcessMetrics(),
    };

    expect(characterizeWorkload(metrics)).toBe('unknown');
  });
});

describe('formatTaskRunMetricsDetailed', () => {
  test('formats detailed report with all metrics', () => {
    const metrics: TaskRunMetrics = {
      childProcessMetrics: createMockChildProcessMetrics(),
      systemCpuMetrics: createMockSystemCpuMetrics(),
      wallClockMetrics: createMockWallClockMetrics(),
    };

    const detailed = formatTaskRunMetricsDetailed(metrics);

    expect(detailed).toContain('Task Run Metrics:');
    expect(detailed).toContain('Wall clock:');
    expect(detailed).toContain('Child:');
    expect(detailed).toContain('System CPU:');
    expect(detailed).toContain('Workload:');
  });

  test('formats detailed report with only wall-clock metrics', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics(),
    };

    const detailed = formatTaskRunMetricsDetailed(metrics);

    expect(detailed).toContain('Task Run Metrics:');
    expect(detailed).toContain('Wall clock:');
    expect(detailed).not.toContain('Child:');
    expect(detailed).not.toContain('System CPU:');
    expect(detailed).toContain('Workload: cpu_bound');
  });

  test('includes workload characterization in detailed output', () => {
    const metrics: TaskRunMetrics = {
      wallClockMetrics: createMockWallClockMetrics({
        interpretation: 'io_bound',
      }),
    };

    const detailed = formatTaskRunMetricsDetailed(metrics);

    expect(detailed).toContain('Workload: io_bound');
  });
});
