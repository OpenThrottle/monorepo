import { describe, expect, test } from 'vitest';
import { parseTaskRunMetricsFromReturnvalue } from './parse-task-run-metrics';

describe('parseTaskRunMetricsFromReturnvalue', () => {
  const validSnapshot = {
    cpuSystemMs: 10,
    cpuUserMs: 100,
    externalMb: 1,
    heapTotalMb: 30,
    heapUsedMb: 20,
    rssMb: 50,
  };

  const validChildProcessMetrics = {
    avgCpuPercent: 42.5,
    avgRssMb: 256,
    peakCpuPercent: 85.2,
    peakRssMb: 512,
    pid: 12345,
    pollIntervalMs: 5000,
    sampleCount: 15,
  };

  const validWallClockMetrics = {
    cpuSystemMs: 500,
    cpuTimeMs: 2500,
    cpuUserMs: 2000,
    endTimestamp: 1700000010000,
    interpretation: 'mixed',
    startTimestamp: 1700000000000,
    wallClockMs: 10000,
    wallClockToCpuRatio: 4.0,
  };

  const validPsi = {
    full10s: null,
    full300s: null,
    full60s: null,
    fullTotalUs: null,
    some10s: 2.5,
    some300s: 1.8,
    some60s: 2.0,
    someTotalUs: 50000,
  };

  const validLoadAverage = {
    cpuCount: 8,
    load15m: 1.2,
    load1m: 2.5,
    load5m: 1.8,
    perCoreLoad1m: 0.31,
  };

  const validSystemCpuSnapshot = {
    loadAverage: validLoadAverage,
    psi: validPsi,
    timestamp: 1700000000000,
  };

  const validSystemCpuMetrics = {
    atEnd: { ...validSystemCpuSnapshot, timestamp: 1700000010000 },
    atStart: validSystemCpuSnapshot,
    platform: 'linux',
    pressureLevel: 'low',
    psiAvailable: true,
    psiFullDeltaUs: null,
    psiSomeDeltaUs: 1000,
  };

  test('returns null when returnvalue is null', () => {
    expect(parseTaskRunMetricsFromReturnvalue(null)).toBeNull();
  });

  test('returns null when returnvalue is empty string', () => {
    expect(parseTaskRunMetricsFromReturnvalue('')).toBeNull();
  });

  test('returns null when returnvalue is invalid JSON', () => {
    expect(parseTaskRunMetricsFromReturnvalue('not json')).toBeNull();
  });

  test('returns null when parsed object has no taskRunMetrics', () => {
    expect(
      parseTaskRunMetricsFromReturnvalue(JSON.stringify({ planId: 'p1' })),
    ).toBeNull();
  });

  test('returns null when taskRunMetrics is missing atStart or atEnd', () => {
    expect(
      parseTaskRunMetricsFromReturnvalue(
        JSON.stringify({
          taskRunMetrics: { atStart: validSnapshot },
        }),
      ),
    ).toBeNull();
  });

  test('returns null when snapshot has wrong types', () => {
    expect(
      parseTaskRunMetricsFromReturnvalue(
        JSON.stringify({
          taskRunMetrics: {
            atEnd: validSnapshot,
            atStart: { ...validSnapshot, rssMb: '50' },
          },
        }),
      ),
    ).toBeNull();
  });

  test('returns TaskRunMetricsObject when returnvalue has valid taskRunMetrics', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: {
          ...validSnapshot,
          cpuUserMs: 200,
          rssMb: 55,
        },
        atStart: validSnapshot,
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.atStart.rssMb).toBe(50);
    expect(result?.atStart.cpuUserMs).toBe(100);
    expect(result?.atEnd.rssMb).toBe(55);
    expect(result?.atEnd.cpuUserMs).toBe(200);
  });

  test('parses childProcessMetrics when present', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        childProcessMetrics: validChildProcessMetrics,
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.childProcessMetrics).toBeDefined();
    expect(result?.childProcessMetrics?.pid).toBe(12345);
    expect(result?.childProcessMetrics?.peakCpuPercent).toBe(85.2);
    expect(result?.childProcessMetrics?.avgCpuPercent).toBe(42.5);
    expect(result?.childProcessMetrics?.peakRssMb).toBe(512);
    expect(result?.childProcessMetrics?.avgRssMb).toBe(256);
    expect(result?.childProcessMetrics?.sampleCount).toBe(15);
    expect(result?.childProcessMetrics?.pollIntervalMs).toBe(5000);
  });

  test('parses wallClockMetrics when present', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        wallClockMetrics: validWallClockMetrics,
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.wallClockMetrics).toBeDefined();
    expect(result?.wallClockMetrics?.wallClockMs).toBe(10000);
    expect(result?.wallClockMetrics?.cpuTimeMs).toBe(2500);
    expect(result?.wallClockMetrics?.wallClockToCpuRatio).toBe(4.0);
    expect(result?.wallClockMetrics?.interpretation).toBe('mixed');
    expect(result?.wallClockMetrics?.startTimestamp).toBe(1700000000000);
    expect(result?.wallClockMetrics?.endTimestamp).toBe(1700000010000);
  });

  test('parses systemCpuMetrics when present', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        systemCpuMetrics: validSystemCpuMetrics,
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.systemCpuMetrics).toBeDefined();
    expect(result?.systemCpuMetrics?.platform).toBe('linux');
    expect(result?.systemCpuMetrics?.psiAvailable).toBe(true);
    expect(result?.systemCpuMetrics?.pressureLevel).toBe('low');
    expect(result?.systemCpuMetrics?.psiSomeDeltaUs).toBe(1000);
    expect(result?.systemCpuMetrics?.psiFullDeltaUs).toBeNull();
    expect(result?.systemCpuMetrics?.atStart.timestamp).toBe(1700000000000);
    expect(result?.systemCpuMetrics?.atStart.loadAverage.load1m).toBe(2.5);
    expect(result?.systemCpuMetrics?.atStart.loadAverage.cpuCount).toBe(8);
    expect(result?.systemCpuMetrics?.atStart.psi.some10s).toBe(2.5);
    expect(result?.systemCpuMetrics?.atEnd.timestamp).toBe(1700000010000);
  });

  test('parses all new metrics when present together', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        childProcessMetrics: validChildProcessMetrics,
        systemCpuMetrics: validSystemCpuMetrics,
        wallClockMetrics: validWallClockMetrics,
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.atStart).toBeDefined();
    expect(result?.atEnd).toBeDefined();
    expect(result?.childProcessMetrics).toBeDefined();
    expect(result?.wallClockMetrics).toBeDefined();
    expect(result?.systemCpuMetrics).toBeDefined();
  });

  test('ignores invalid childProcessMetrics but still parses base metrics', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        childProcessMetrics: { pid: 'invalid' },
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.atStart).toBeDefined();
    expect(result?.atEnd).toBeDefined();
    expect(result?.childProcessMetrics).toBeUndefined();
  });

  test('ignores invalid wallClockMetrics but still parses base metrics', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        wallClockMetrics: { wallClockMs: 'invalid' },
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.atStart).toBeDefined();
    expect(result?.atEnd).toBeDefined();
    expect(result?.wallClockMetrics).toBeUndefined();
  });

  test('ignores invalid systemCpuMetrics but still parses base metrics', () => {
    const returnvalue = JSON.stringify({
      taskRunMetrics: {
        atEnd: validSnapshot,
        atStart: validSnapshot,
        systemCpuMetrics: { platform: 123 },
      },
    });

    const result = parseTaskRunMetricsFromReturnvalue(returnvalue);

    expect(result).not.toBeNull();
    expect(result?.atStart).toBeDefined();
    expect(result?.atEnd).toBeDefined();
    expect(result?.systemCpuMetrics).toBeUndefined();
  });
});
