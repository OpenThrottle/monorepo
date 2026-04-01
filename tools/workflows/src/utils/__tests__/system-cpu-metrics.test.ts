import * as os from 'os';
import { describe, expect, it } from 'vitest';
import {
  captureLoadAverage,
  createEmptyPsiMetrics,
  determinePressureLevel,
  formatSystemCpuMetrics,
} from '../../types/system-cpu-metrics';
import type {
  LoadAverageMetrics,
  PsiCpuMetrics,
  SystemCpuMetrics,
  SystemCpuSnapshot,
} from '../../types/system-cpu-metrics';
import {
  captureSystemCpuSnapshot,
  createSystemCpuMetrics,
  createSystemCpuMetricsCollector,
  isPsiAvailable,
  readPsiCpuMetrics,
  sampleSystemCpu,
} from '../system-cpu-metrics';

describe('captureLoadAverage', () => {
  it('returns load average values from os.loadavg()', () => {
    const metrics = captureLoadAverage();

    expect(metrics.load1m).toBeGreaterThanOrEqual(0);
    expect(metrics.load5m).toBeGreaterThanOrEqual(0);
    expect(metrics.load15m).toBeGreaterThanOrEqual(0);
    expect(metrics.cpuCount).toBeGreaterThan(0);
    expect(metrics.cpuCount).toBe(os.cpus().length);
  });

  it('computes perCoreLoad1m correctly', () => {
    const metrics = captureLoadAverage();
    const expectedPerCore = metrics.load1m / metrics.cpuCount;

    expect(metrics.perCoreLoad1m).toBeCloseTo(expectedPerCore, 1);
  });
});

describe('createEmptyPsiMetrics', () => {
  it('returns all null fields', () => {
    const psi = createEmptyPsiMetrics();

    expect(psi.some10s).toBeNull();
    expect(psi.some60s).toBeNull();
    expect(psi.some300s).toBeNull();
    expect(psi.someTotalUs).toBeNull();
    expect(psi.full10s).toBeNull();
    expect(psi.full60s).toBeNull();
    expect(psi.full300s).toBeNull();
    expect(psi.fullTotalUs).toBeNull();
  });
});

describe('determinePressureLevel', () => {
  const basePsi: PsiCpuMetrics = createEmptyPsiMetrics();

  it('returns low when perCoreLoad < 0.7 and no PSI', () => {
    const loadAverage: LoadAverageMetrics = {
      cpuCount: 8,
      load15m: 0.5,
      load1m: 0.5,
      load5m: 0.5,
      perCoreLoad1m: 0.5 / 8,
    };

    const result = determinePressureLevel(loadAverage, basePsi);
    expect(result).toBe('low');
  });

  it('returns low when perCoreLoad < 0.7 and PSI some < 5', () => {
    const loadAverage: LoadAverageMetrics = {
      cpuCount: 8,
      load15m: 0.5,
      load1m: 0.5,
      load5m: 0.5,
      perCoreLoad1m: 0.5 / 8,
    };
    const psi: PsiCpuMetrics = {
      ...basePsi,
      some10s: 2,
    };

    const result = determinePressureLevel(loadAverage, psi);
    expect(result).toBe('low');
  });

  it('returns moderate when perCoreLoad >= 0.7 and <= 1.5', () => {
    const loadAverage: LoadAverageMetrics = {
      cpuCount: 8,
      load15m: 8,
      load1m: 8,
      load5m: 8,
      perCoreLoad1m: 1.0,
    };

    const result = determinePressureLevel(loadAverage, basePsi);
    expect(result).toBe('moderate');
  });

  it('returns moderate when PSI some between 5-20', () => {
    const loadAverage: LoadAverageMetrics = {
      cpuCount: 8,
      load15m: 0.5,
      load1m: 0.5,
      load5m: 0.5,
      perCoreLoad1m: 0.5 / 8,
    };
    const psi: PsiCpuMetrics = {
      ...basePsi,
      some10s: 10,
    };

    const result = determinePressureLevel(loadAverage, psi);
    expect(result).toBe('moderate');
  });

  it('returns high when perCoreLoad > 1.5', () => {
    const loadAverage: LoadAverageMetrics = {
      cpuCount: 4,
      load15m: 8,
      load1m: 8,
      load5m: 8,
      perCoreLoad1m: 2.0,
    };

    const result = determinePressureLevel(loadAverage, basePsi);
    expect(result).toBe('high');
  });

  it('returns high when PSI some > 20', () => {
    const loadAverage: LoadAverageMetrics = {
      cpuCount: 8,
      load15m: 0.5,
      load1m: 0.5,
      load5m: 0.5,
      perCoreLoad1m: 0.5 / 8,
    };
    const psi: PsiCpuMetrics = {
      ...basePsi,
      some10s: 25,
    };

    const result = determinePressureLevel(loadAverage, psi);
    expect(result).toBe('high');
  });
});

describe('readPsiCpuMetrics', () => {
  it('returns empty metrics on non-Linux platforms', async () => {
    const psi = await readPsiCpuMetrics();

    if (os.platform() !== 'linux') {
      expect(psi.some10s).toBeNull();
      expect(psi.someTotalUs).toBeNull();
    }
  });

  it('returns metrics object with correct shape', async () => {
    const psi = await readPsiCpuMetrics();

    expect(psi).toHaveProperty('some10s');
    expect(psi).toHaveProperty('some60s');
    expect(psi).toHaveProperty('some300s');
    expect(psi).toHaveProperty('someTotalUs');
    expect(psi).toHaveProperty('full10s');
    expect(psi).toHaveProperty('full60s');
    expect(psi).toHaveProperty('full300s');
    expect(psi).toHaveProperty('fullTotalUs');
  });
});

describe('captureSystemCpuSnapshot', () => {
  it('returns a snapshot with timestamp and loadAverage', async () => {
    const snapshot = await captureSystemCpuSnapshot();

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.loadAverage.load1m).toBeGreaterThanOrEqual(0);
    expect(snapshot.loadAverage.cpuCount).toBeGreaterThan(0);
    expect(snapshot.psi).toBeDefined();
  });

  it('timestamp is close to current time', async () => {
    const before = Date.now();
    const snapshot = await captureSystemCpuSnapshot();
    const after = Date.now();

    expect(snapshot.timestamp).toBeGreaterThanOrEqual(before);
    expect(snapshot.timestamp).toBeLessThanOrEqual(after);
  });
});

describe('createSystemCpuMetrics', () => {
  it('creates metrics from start and end snapshots', async () => {
    const start = await captureSystemCpuSnapshot();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const end = await captureSystemCpuSnapshot();

    const metrics = createSystemCpuMetrics(start, end);

    expect(metrics.platform).toBe(os.platform());
    expect(metrics.atStart).toBe(start);
    expect(metrics.atEnd).toBe(end);
    expect(['low', 'moderate', 'high', 'unknown']).toContain(
      metrics.pressureLevel,
    );
  });

  it('sets psiAvailable based on platform and PSI data', async () => {
    const start = await captureSystemCpuSnapshot();
    const end = await captureSystemCpuSnapshot();

    const metrics = createSystemCpuMetrics(start, end);

    if (os.platform() !== 'linux') {
      expect(metrics.psiAvailable).toBe(false);
    }
  });

  it('computes PSI delta when available', () => {
    const start: SystemCpuSnapshot = {
      loadAverage: captureLoadAverage(),
      psi: {
        ...createEmptyPsiMetrics(),
        fullTotalUs: 1000,
        someTotalUs: 5000,
      },
      timestamp: Date.now() - 1000,
    };

    const end: SystemCpuSnapshot = {
      loadAverage: captureLoadAverage(),
      psi: {
        ...createEmptyPsiMetrics(),
        fullTotalUs: 1500,
        someTotalUs: 7000,
      },
      timestamp: Date.now(),
    };

    const metrics = createSystemCpuMetrics(start, end);

    expect(metrics.psiSomeDeltaUs).toBe(2000);
    expect(metrics.psiFullDeltaUs).toBe(500);
  });

  it('returns null deltas when PSI not available', () => {
    const start: SystemCpuSnapshot = {
      loadAverage: captureLoadAverage(),
      psi: createEmptyPsiMetrics(),
      timestamp: Date.now() - 1000,
    };

    const end: SystemCpuSnapshot = {
      loadAverage: captureLoadAverage(),
      psi: createEmptyPsiMetrics(),
      timestamp: Date.now(),
    };

    const metrics = createSystemCpuMetrics(start, end);

    expect(metrics.psiSomeDeltaUs).toBeNull();
    expect(metrics.psiFullDeltaUs).toBeNull();
  });
});

describe('createSystemCpuMetricsCollector', () => {
  it('starts not started and not stopped', () => {
    const collector = createSystemCpuMetricsCollector();

    expect(collector.started).toBe(false);
    expect(collector.stopped).toBe(false);
  });

  it('marks started after start()', async () => {
    const collector = createSystemCpuMetricsCollector();
    await collector.start();

    expect(collector.started).toBe(true);
    expect(collector.stopped).toBe(false);
  });

  it('marks stopped after stop()', async () => {
    const collector = createSystemCpuMetricsCollector();
    await collector.start();
    await collector.stop();

    expect(collector.stopped).toBe(true);
  });

  it('returns valid metrics from stop()', async () => {
    const collector = createSystemCpuMetricsCollector();
    await collector.start();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const metrics = await collector.stop();

    expect(metrics.platform).toBe(os.platform());
    expect(metrics.atStart.timestamp).toBeLessThan(metrics.atEnd.timestamp);
  });

  it('start() is idempotent - returns same snapshot on multiple calls', async () => {
    const collector = createSystemCpuMetricsCollector();

    const snapshot1 = await collector.start();
    const snapshot2 = await collector.start();

    expect(snapshot1).toBe(snapshot2);
  });

  it('stop() captures start snapshot if not already started', async () => {
    const collector = createSystemCpuMetricsCollector();
    const metrics = await collector.stop();

    expect(metrics.atStart.timestamp).toBeLessThanOrEqual(
      metrics.atEnd.timestamp,
    );
  });
});

describe('sampleSystemCpu', () => {
  it('returns a valid snapshot', async () => {
    const snapshot = await sampleSystemCpu();

    expect(snapshot.timestamp).toBeGreaterThan(0);
    expect(snapshot.loadAverage).toBeDefined();
    expect(snapshot.psi).toBeDefined();
  });
});

describe('isPsiAvailable', () => {
  it('returns boolean', async () => {
    const available = await isPsiAvailable();

    expect(typeof available).toBe('boolean');
  });

  it('returns false on non-Linux platforms', async () => {
    const available = await isPsiAvailable();

    if (os.platform() !== 'linux') {
      expect(available).toBe(false);
    }
  });
});

describe('formatSystemCpuMetrics', () => {
  it('formats metrics as a readable string', () => {
    const metrics: SystemCpuMetrics = {
      atEnd: {
        loadAverage: {
          cpuCount: 8,
          load15m: 1.5,
          load1m: 2.0,
          load5m: 1.8,
          perCoreLoad1m: 0.25,
        },
        psi: createEmptyPsiMetrics(),
        timestamp: Date.now(),
      },
      atStart: {
        loadAverage: {
          cpuCount: 8,
          load15m: 1.5,
          load1m: 2.0,
          load5m: 1.8,
          perCoreLoad1m: 0.25,
        },
        psi: createEmptyPsiMetrics(),
        timestamp: Date.now() - 1000,
      },
      platform: 'darwin',
      pressureLevel: 'low',
      psiAvailable: false,
      psiFullDeltaUs: null,
      psiSomeDeltaUs: null,
    };

    const formatted = formatSystemCpuMetrics(metrics);

    expect(formatted).toContain('System CPU:');
    expect(formatted).toContain('load 2');
    expect(formatted).toContain('0.25/core');
    expect(formatted).toContain('8 cores');
    expect(formatted).toContain('pressure: low');
    expect(formatted).toContain('PSI unavailable on darwin');
  });

  it('includes PSI metrics when available', () => {
    const metrics: SystemCpuMetrics = {
      atEnd: {
        loadAverage: {
          cpuCount: 4,
          load15m: 4.0,
          load1m: 6.0,
          load5m: 5.0,
          perCoreLoad1m: 1.5,
        },
        psi: {
          ...createEmptyPsiMetrics(),
          some10s: 15.5,
          someTotalUs: 50000,
        },
        timestamp: Date.now(),
      },
      atStart: {
        loadAverage: {
          cpuCount: 4,
          load15m: 4.0,
          load1m: 6.0,
          load5m: 5.0,
          perCoreLoad1m: 1.5,
        },
        psi: {
          ...createEmptyPsiMetrics(),
          some10s: 15.0,
          someTotalUs: 40000,
        },
        timestamp: Date.now() - 1000,
      },
      platform: 'linux',
      pressureLevel: 'moderate',
      psiAvailable: true,
      psiFullDeltaUs: null,
      psiSomeDeltaUs: 10000,
    };

    const formatted = formatSystemCpuMetrics(metrics);

    expect(formatted).toContain('PSI some10s: 15.5%');
    expect(formatted).toContain('stall delta: 10.0ms');
    expect(formatted).not.toContain('PSI unavailable');
  });
});
