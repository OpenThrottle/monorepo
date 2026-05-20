import { describe, it, expect } from 'vitest';
import {
  formatEnhancedTaskRunMetricsSummary,
  formatTaskRunMetricsSummary,
} from './process-metrics-format';
import type {
  EnhancedTaskRunMetrics,
  TaskRunMetrics,
} from './process-metrics.types';

describe('formatTaskRunMetricsSummary', () => {
  const metrics: TaskRunMetrics = {
    atEnd: {
      cpuSystemMs: 80,
      cpuUserMs: 450,
      externalMb: 0.6,
      heapTotalMb: 35,
      heapUsedMb: 28.3,
      rssMb: 52.1,
    },
    atStart: {
      cpuSystemMs: 10,
      cpuUserMs: 120,
      externalMb: 0.5,
      heapTotalMb: 30,
      heapUsedMb: 22.1,
      rssMb: 45.2,
    },
  };

  it('returns a one-line summary with RSS, heap, CPU user and system', () => {
    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).toContain('Task run metrics:');
    expect(summary).toMatch(/RSS 45\.2→52\.1 MB/);
    expect(summary).toMatch(/heap 22\.1→28\.3 MB/);
    expect(summary).toMatch(/CPU user 120→450 ms/);
    expect(summary).toMatch(/system 10→80 ms/);
  });

  it('produces a single line without newlines', () => {
    const summary = formatTaskRunMetricsSummary(metrics);

    expect(summary).not.toContain('\n');
  });
});

describe('formatEnhancedTaskRunMetricsSummary', () => {
  const baseMetrics: TaskRunMetrics = {
    atEnd: {
      cpuSystemMs: 80,
      cpuUserMs: 450,
      externalMb: 0.6,
      heapTotalMb: 35,
      heapUsedMb: 28.3,
      rssMb: 52.1,
    },
    atStart: {
      cpuSystemMs: 10,
      cpuUserMs: 120,
      externalMb: 0.5,
      heapTotalMb: 30,
      heapUsedMb: 22.1,
      rssMb: 45.2,
    },
  };

  it('falls back to basic format when no enhanced metrics are present', () => {
    const summary = formatEnhancedTaskRunMetricsSummary(baseMetrics);

    expect(summary).toContain('Task run metrics:');
  });

  it('includes wall-clock duration and ratio when wallClockMetrics is present', () => {
    const metrics: EnhancedTaskRunMetrics = {
      ...baseMetrics,
      wallClockMetrics: {
        cpuSystemMs: 500,
        cpuTimeMs: 1500,
        cpuUserMs: 1000,
        endTimestamp: Date.now(),
        interpretation: 'mixed',
        startTimestamp: Date.now() - 45200,
        wallClockMs: 45200,
        wallClockToCpuRatio: 2.5,
      },
    };
    const summary = formatEnhancedTaskRunMetricsSummary(metrics);

    expect(summary).toContain('Metrics:');
    expect(summary).toMatch(/45\.2s wall/);
    expect(summary).toMatch(/ratio 2\.5x \(mixed\)/);
  });

  it('includes child process peak CPU when childProcessMetrics is present', () => {
    const metrics: EnhancedTaskRunMetrics = {
      ...baseMetrics,
      childProcessMetrics: {
        avgCpuPercent: 42,
        avgRssMb: 256,
        peakCpuPercent: 85.3,
        peakRssMb: 512,
        pid: 12345,
        pollIntervalMs: 5000,
        sampleCount: 10,
      },
      wallClockMetrics: {
        cpuSystemMs: 500,
        cpuTimeMs: 1500,
        cpuUserMs: 1000,
        endTimestamp: Date.now(),
        interpretation: 'cpu_bound',
        startTimestamp: Date.now() - 10000,
        wallClockMs: 10000,
        wallClockToCpuRatio: 1.2,
      },
    };
    const summary = formatEnhancedTaskRunMetricsSummary(metrics);

    expect(summary).toContain('child peak 85%');
  });

  it('includes system load when systemCpuMetrics is present', () => {
    const metrics: EnhancedTaskRunMetrics = {
      ...baseMetrics,
      systemCpuMetrics: {
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
            some10s: null,
            some300s: null,
            some60s: null,
            someTotalUs: null,
          },
          timestamp: Date.now(),
        },
        atStart: {
          loadAverage: {
            cpuCount: 8,
            load15m: 1.2,
            load1m: 1.5,
            load5m: 1.4,
            perCoreLoad1m: 0.19,
          },
          psi: {
            full10s: null,
            full300s: null,
            full60s: null,
            fullTotalUs: null,
            some10s: null,
            some300s: null,
            some60s: null,
            someTotalUs: null,
          },
          timestamp: Date.now() - 10000,
        },
        platform: 'darwin',
        pressureLevel: 'low',
        psiAvailable: false,
        psiFullDeltaUs: null,
        psiSomeDeltaUs: null,
      },
      wallClockMetrics: {
        cpuSystemMs: 500,
        cpuTimeMs: 1500,
        cpuUserMs: 1000,
        endTimestamp: Date.now(),
        interpretation: 'mixed',
        startTimestamp: Date.now() - 10000,
        wallClockMs: 10000,
        wallClockToCpuRatio: 2.0,
      },
    };
    const summary = formatEnhancedTaskRunMetricsSummary(metrics);

    expect(summary).toContain('load 0.3/core (low)');
  });

  it('produces a single line without newlines', () => {
    const metrics: EnhancedTaskRunMetrics = {
      ...baseMetrics,
      wallClockMetrics: {
        cpuSystemMs: 500,
        cpuTimeMs: 1500,
        cpuUserMs: 1000,
        endTimestamp: Date.now(),
        interpretation: 'mixed',
        startTimestamp: Date.now() - 10000,
        wallClockMs: 10000,
        wallClockToCpuRatio: 2.0,
      },
    };
    const summary = formatEnhancedTaskRunMetricsSummary(metrics);

    expect(summary).not.toContain('\n');
  });
});
