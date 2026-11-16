import { describe, expect, test } from 'vitest';

import type {
  CgroupCpuMetrics,
  CgroupFileContents,
  CgroupMetrics,
  CgroupMetricsAvailable,
  SystemMetricsSnapshot,
} from './system-metrics.types.ts';
import {
  buildCgroupMetrics,
  buildRunSystemCpuMetrics,
  captureHostMemory,
  computeCgroupCpuWindow,
  determineContainerPressureLevel,
  parseCgroupBytes,
  parseCgroupV2Path,
  parseCpuMax,
  parseFlatKeyed,
  parseMemoryEvents,
  parsePsiContent,
} from './system-metrics.utils.ts';

// Captured from the openthrottle-server image run with --cpus 0.75 --memory 640m.
const CPU_STAT = `usage_usec 616032
user_usec 565537
system_usec 50494
nice_usec 0
nr_periods 8
nr_throttled 5
throttled_usec 77161
nr_bursts 0
burst_usec 0`;

const MEMORY_EVENTS = `low 0
high 3
max 2
oom 1
oom_kill 1
oom_group_kill 0`;

const PSI = `some avg10=1.73 avg60=1.38 avg300=1.24 total=15764045328
full avg10=0.10 avg60=0.20 avg300=0.30 total=0`;

const CONTAINER_FILES: CgroupFileContents = {
  cpuMax: '75000 100000\n',
  cpuPressure: PSI,
  cpuStat: CPU_STAT,
  memoryCurrent: '122023936\n',
  memoryEvents: MEMORY_EVENTS,
  memoryHigh: 'max\n',
  memoryMax: '671088640\n',
};

describe('parseCgroupV2Path', () => {
  test('returns the root of a private cgroup namespace', () => {
    expect(parseCgroupV2Path('0::/\n')).toBe('/');
  });

  test('returns a nested host path', () => {
    expect(parseCgroupV2Path('0::/system.slice/openthrottle.service\n')).toBe(
      '/system.slice/openthrottle.service',
    );
  });

  test('picks the v2 line out of a hybrid hierarchy', () => {
    const hybrid = `12:memory:/docker/abc\n11:cpu,cpuacct:/docker/abc\n0::/docker/abc`;
    expect(parseCgroupV2Path(hybrid)).toBe('/docker/abc');
  });

  test('returns null on cgroup v1 only', () => {
    expect(parseCgroupV2Path('12:memory:/docker/abc\n11:cpu:/docker/abc')).toBe(
      null,
    );
  });

  test('returns null on empty content', () => {
    expect(parseCgroupV2Path('')).toBe(null);
  });
});

describe('parseCpuMax', () => {
  test('converts quota/period to vCPUs', () => {
    expect(parseCpuMax('75000 100000\n')).toBe(0.75);
    expect(parseCpuMax('200000 100000')).toBe(2);
  });

  test('returns null for an unlimited quota', () => {
    expect(parseCpuMax('max 100000\n')).toBe(null);
  });

  test('returns null for a missing file', () => {
    expect(parseCpuMax(null)).toBe(null);
  });

  test('returns null for garbage or a zero period', () => {
    expect(parseCpuMax('nonsense')).toBe(null);
    expect(parseCpuMax('1000 0')).toBe(null);
  });
});

describe('parseCgroupBytes', () => {
  test('parses a byte count', () => {
    expect(parseCgroupBytes('671088640\n')).toBe(671088640);
  });

  test('returns null for max, missing, empty or garbage', () => {
    expect(parseCgroupBytes('max\n')).toBe(null);
    expect(parseCgroupBytes(null)).toBe(null);
    expect(parseCgroupBytes('')).toBe(null);
    expect(parseCgroupBytes('lots')).toBe(null);
  });
});

describe('parseFlatKeyed', () => {
  test('parses key/value lines', () => {
    const stat = parseFlatKeyed(CPU_STAT);
    expect(stat.get('usage_usec')).toBe(616032);
    expect(stat.get('nr_throttled')).toBe(5);
  });

  test('skips malformed lines', () => {
    const parsed = parseFlatKeyed('good 1\nbad\nworse x\n');
    expect([...parsed.entries()]).toEqual([['good', 1]]);
  });

  test('returns an empty map for a missing file', () => {
    expect(parseFlatKeyed(null).size).toBe(0);
  });
});

describe('parseMemoryEvents', () => {
  test('maps the sizing counters', () => {
    expect(parseMemoryEvents(MEMORY_EVENTS)).toEqual({
      high: 3,
      max: 2,
      oom: 1,
      oomKill: 1,
    });
  });

  test('defaults absent counters to zero', () => {
    expect(parseMemoryEvents('low 0\n')).toEqual({
      high: 0,
      max: 0,
      oom: 0,
      oomKill: 0,
    });
  });

  test('returns null for a missing file', () => {
    expect(parseMemoryEvents(null)).toBe(null);
  });
});

describe('parsePsiContent', () => {
  test('parses some and full lines', () => {
    expect(parsePsiContent(PSI, 'container')).toEqual({
      full10s: 0.1,
      full300s: 0.3,
      full60s: 0.2,
      fullTotalUs: 0,
      scope: 'container',
      some10s: 1.73,
      some300s: 1.24,
      some60s: 1.38,
      someTotalUs: 15764045328,
    });
  });

  test('leaves full null when only some is present', () => {
    const result = parsePsiContent(
      'some avg10=2.00 avg60=1.00 avg300=0.50 total=1',
      'host',
    );
    expect(result.some10s).toBe(2);
    expect(result.full10s).toBe(null);
  });

  test('returns all nulls for a missing file', () => {
    expect(parsePsiContent(null, 'host')).toEqual({
      full10s: null,
      full300s: null,
      full60s: null,
      fullTotalUs: null,
      scope: 'host',
      some10s: null,
      some300s: null,
      some60s: null,
      someTotalUs: null,
    });
  });
});

describe('buildCgroupMetrics', () => {
  test('builds a limited container cgroup', () => {
    expect(buildCgroupMetrics('/sys/fs/cgroup', CONTAINER_FILES)).toEqual({
      cpu: {
        limitVcpus: 0.75,
        nrPeriods: 8,
        nrThrottled: 5,
        throttledUsec: 77161,
        usageUsec: 616032,
      },
      cpuWindow: null,
      kind: 'cgroup',
      memory: {
        currentBytes: 122023936,
        events: { high: 3, max: 2, oom: 1, oomKill: 1 },
        highBytes: null,
        limitBytes: 671088640,
      },
      path: '/sys/fs/cgroup',
      psi: parsePsiContent(PSI, 'container'),
      scope: 'container',
    });
  });

  test('reads missing limit files as unlimited', () => {
    const result = buildCgroupMetrics('/sys/fs/cgroup/user.slice', {
      ...CONTAINER_FILES,
      cpuMax: null,
      memoryHigh: null,
      memoryMax: null,
    });
    if (result.kind !== 'cgroup') {
      throw new Error('expected a cgroup result');
    }
    expect(result.cpu.limitVcpus).toBe(null);
    expect(result.memory.limitBytes).toBe(null);
    expect(result.memory.highBytes).toBe(null);
  });

  test('reads max limits as unlimited', () => {
    const result = buildCgroupMetrics('/sys/fs/cgroup', {
      ...CONTAINER_FILES,
      cpuMax: 'max 100000',
      memoryMax: 'max',
    });
    if (result.kind !== 'cgroup') {
      throw new Error('expected a cgroup result');
    }
    expect(result.cpu.limitVcpus).toBe(null);
    expect(result.memory.limitBytes).toBe(null);
  });

  test('is unavailable when no accounting file is readable', () => {
    const result = buildCgroupMetrics('/sys/fs/cgroup', {
      cpuMax: null,
      cpuPressure: null,
      cpuStat: null,
      memoryCurrent: null,
      memoryEvents: null,
      memoryHigh: null,
      memoryMax: null,
    });
    expect(result.kind).toBe('unavailable');
  });
});

const LIMITED_CPU: CgroupCpuMetrics = {
  limitVcpus: 0.75,
  nrPeriods: 100,
  nrThrottled: 10,
  throttledUsec: 0,
  usageUsec: 1_000_000,
};

describe('computeCgroupCpuWindow', () => {
  test('computes usage against the limit and the throttled share', () => {
    const window = computeCgroupCpuWindow(
      { atMs: 0, cpu: LIMITED_CPU },
      {
        atMs: 2000,
        cpu: {
          ...LIMITED_CPU,
          nrPeriods: 120,
          nrThrottled: 15,
          usageUsec: 2_200_000,
        },
      },
    );
    expect(window).toEqual({
      elapsedMs: 2000,
      throttledPeriodRatio: 0.25,
      usageRatioOfLimit: 0.8,
      usedVcpus: 0.6,
    });
  });

  test('leaves the limit ratio null when unlimited', () => {
    const unlimited = { ...LIMITED_CPU, limitVcpus: null };
    const window = computeCgroupCpuWindow(
      { atMs: 0, cpu: unlimited },
      { atMs: 1000, cpu: { ...unlimited, usageUsec: 1_500_000 } },
    );
    expect(window?.usedVcpus).toBe(0.5);
    expect(window?.usageRatioOfLimit).toBe(null);
  });

  test('leaves the throttled share null when no periods elapsed', () => {
    const window = computeCgroupCpuWindow(
      { atMs: 0, cpu: LIMITED_CPU },
      { atMs: 1000, cpu: LIMITED_CPU },
    );
    expect(window?.throttledPeriodRatio).toBe(null);
  });

  test('returns null when no time passed or usage went backwards', () => {
    expect(
      computeCgroupCpuWindow(
        { atMs: 5, cpu: LIMITED_CPU },
        { atMs: 5, cpu: LIMITED_CPU },
      ),
    ).toBe(null);
    expect(
      computeCgroupCpuWindow(
        { atMs: 0, cpu: LIMITED_CPU },
        { atMs: 1000, cpu: { ...LIMITED_CPU, usageUsec: 1 } },
      ),
    ).toBe(null);
  });

  test('returns null when usage is missing', () => {
    const missing = { ...LIMITED_CPU, usageUsec: null };
    expect(
      computeCgroupCpuWindow(
        { atMs: 0, cpu: missing },
        { atMs: 1000, cpu: missing },
      ),
    ).toBe(null);
  });
});

describe('determineContainerPressureLevel', () => {
  const base = buildCgroupMetrics('/sys/fs/cgroup', {
    ...CONTAINER_FILES,
    cpuPressure: null,
  });
  if (base.kind !== 'cgroup') {
    throw new Error('expected a cgroup fixture');
  }
  const withWindow = (
    throttledPeriodRatio: number | null,
    usageRatioOfLimit: number | null,
  ): CgroupMetricsAvailable => {
    return {
      ...base,
      cpuWindow: {
        elapsedMs: 1000,
        throttledPeriodRatio,
        usageRatioOfLimit,
        usedVcpus: null,
      },
    };
  };

  test('is high when heavily throttled or at the limit', () => {
    expect(determineContainerPressureLevel(withWindow(0.3, 0.1))).toBe('high');
    expect(determineContainerPressureLevel(withWindow(0, 0.95))).toBe('high');
  });

  test('is moderate when throttled or busy against the limit', () => {
    expect(determineContainerPressureLevel(withWindow(0.05, 0.1))).toBe(
      'moderate',
    );
    expect(determineContainerPressureLevel(withWindow(0, 0.7))).toBe(
      'moderate',
    );
  });

  test('is low when idle against the limit', () => {
    expect(determineContainerPressureLevel(withWindow(0, 0.2))).toBe('low');
  });

  test('uses the cgroup PSI when there is no window yet', () => {
    const stalled: CgroupMetricsAvailable = {
      ...base,
      psi: parsePsiContent(
        'some avg10=25.00 avg60=1.00 avg300=0.50 total=1',
        'container',
      ),
    };
    expect(determineContainerPressureLevel(stalled)).toBe('high');
  });

  test('is unknown with no window and no PSI', () => {
    expect(determineContainerPressureLevel(base)).toBe('unknown');
  });
});

describe('captureHostMemory', () => {
  test('reports host memory with its scope', () => {
    const memory = captureHostMemory();
    expect(memory.scope).toBe('host');
    expect(memory.totalBytes).toBeGreaterThan(0);
    expect(memory.usedRatio).toBeGreaterThanOrEqual(0);
    expect(memory.usedRatio).toBeLessThanOrEqual(1);
  });
});

describe('buildRunSystemCpuMetrics', () => {
  const container = buildCgroupMetrics('/sys/fs/cgroup', {
    ...CONTAINER_FILES,
    cpuPressure: null,
  });
  const withCpuCounters = (
    nrPeriods: number,
    nrThrottled: number,
    usageUsec: number,
  ): CgroupMetrics => {
    if (container.kind !== 'cgroup') {
      return container;
    }
    const cpu = { ...container.cpu, nrPeriods, nrThrottled, usageUsec };
    return { ...container, cpu };
  };
  const snapshotAt = (
    timestamp: number,
    usageUsec: number,
    nrPeriods: number,
    nrThrottled: number,
    someTotalUs: number | null,
  ): SystemMetricsSnapshot => {
    const psi = parsePsiContent(null, 'host');
    return {
      activeProcesses: {
        activeWorktreeCount: 0,
        lockedWorktrees: [],
        scope: 'process',
        totalWorktreeCount: 0,
      },
      container: withCpuCounters(nrPeriods, nrThrottled, usageUsec),
      hostMemory: {
        freeBytes: 1,
        scope: 'host',
        totalBytes: 2,
        usedRatio: 0.5,
      },
      loadAverage: {
        cpuCount: 2,
        load15m: 0,
        load1m: 0,
        load5m: 0,
        perCoreLoad1m: 0,
        scope: 'host',
      },
      platform: 'linux',
      pressureBasis: 'container',
      pressureLevel: 'low',
      psi: { ...psi, someTotalUs },
      psiAvailable: true,
      timestamp,
    };
  };

  test('judges a CPU-limited run on its throttling over the whole run', () => {
    const run = buildRunSystemCpuMetrics(
      snapshotAt(0, 0, 0, 0, 100),
      snapshotAt(10_000, 7_000_000, 100, 40, 600),
    );

    expect(run.containerCpuWindow).toEqual({
      elapsedMs: 10_000,
      throttledPeriodRatio: 0.4,
      usageRatioOfLimit: 0.933,
      usedVcpus: 0.7,
    });
    expect(run.pressureBasis).toBe('container');
    expect(run.pressureLevel).toBe('high');
    expect(run.psiSomeDeltaUs).toBe(500);
    expect(run.psiFullDeltaUs).toBe(null);
    expect(run.atEnd.container.kind).toBe('cgroup');
  });

  test('keeps the host pressure level without a container', () => {
    const start: SystemMetricsSnapshot = {
      ...snapshotAt(0, 0, 0, 0, null),
      container: { kind: 'unavailable', reason: 'x', scope: 'container' },
      pressureBasis: 'host',
      pressureLevel: 'moderate',
    };
    const run = buildRunSystemCpuMetrics(start, { ...start, timestamp: 1000 });

    expect(run.containerCpuWindow).toBe(null);
    expect(run.pressureBasis).toBe('host');
    expect(run.pressureLevel).toBe('moderate');
  });
});
