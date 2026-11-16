import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import * as fs from 'fs';
import * as os from 'os';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { SystemMetricsService } from './system-metrics.service.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

afterEach(() => {
  vi.useRealTimers();
});

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: { ...actual.promises, readFile: vi.fn() },
  };
});

/**
 * @description Serves readFile from an in-memory map; any other path rejects with ENOENT.
 */
function serveFiles(files: Readonly<Record<string, string>>): void {
  vi.mocked(fs.promises.readFile).mockImplementation(async (file) => {
    const content = typeof file === 'string' ? files[file] : undefined;
    if (content === undefined) {
      throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    }
    return content;
  });
}

vi.mock('os', async () => {
  const actual = await vi.importActual('os');
  return {
    ...actual,
    cpus: vi.fn().mockReturnValue(new Array(8).fill({})),
    loadavg: vi.fn().mockReturnValue([2.5, 2.0, 1.5]),
    platform: vi.fn().mockReturnValue('darwin'),
  };
});

describe('SystemMetricsService', () => {
  describe('with worktree tracker', () => {
    let service: SystemMetricsService;

    const mockWorktreeTracker = createMock<IWorktreeTargetsTracker>({
      listTargets: vi.fn().mockReturnValue([
        {
          id: 'wt-1',
          lockedBy: 'job-123',
          path: '/path/to/wt1',
          status: 'locked',
        },
        { id: 'wt-2', path: '/path/to/wt2', status: 'available' },
        {
          id: 'wt-3',
          lockedBy: 'job-456',
          path: '/path/to/wt3',
          status: 'locked',
        },
        { id: 'wt-4', path: '/path/to/wt4', status: 'available' },
      ]),
    });

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          SystemMetricsService,
          { provide: WORKTREE_TRACKER_TOKEN, useValue: mockWorktreeTracker },
        ],
      }).compile();

      service = module.get(SystemMetricsService);
    });

    test('returns system snapshot with load average', async () => {
      const result = await service.getSystemSnapshot();

      expect(result.loadAverage).toEqual({
        cpuCount: 8,
        load15m: 1.5,
        load1m: 2.5,
        load5m: 2.0,
        perCoreLoad1m: 0.31,
        scope: 'host',
      });
    });

    test('returns platform', async () => {
      const result = await service.getSystemSnapshot();

      expect(result.platform).toBe('darwin');
    });

    test('returns PSI as unavailable on non-Linux', async () => {
      const result = await service.getSystemSnapshot();

      expect(result.psiAvailable).toBe(false);
      expect(result.psi).toEqual({
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

    test('calculates pressure level from load average', async () => {
      const result = await service.getSystemSnapshot();

      expect(result.pressureLevel).toBe('low');
    });

    test('returns active processes summary from worktree tracker', async () => {
      const result = await service.getSystemSnapshot();

      expect(result.activeProcesses).toEqual({
        activeWorktreeCount: 2,
        lockedWorktrees: ['job-123', 'job-456'],
        scope: 'process',
        totalWorktreeCount: 4,
      });
      expect(mockWorktreeTracker.listTargets).toHaveBeenCalled();
    });

    test('reports host memory and a host pressure basis off Linux', async () => {
      const result = await service.getSystemSnapshot();
      expect(result.hostMemory.scope).toBe('host');
      expect(result.container.kind).toBe('unavailable');
      expect(result.pressureBasis).toBe('host');
    });

    test('returns timestamp', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(FIXED_NOW);
      const result = await service.getSystemSnapshot();

      expect(result.timestamp).toBe(FIXED_NOW.getTime());
    });
  });

  describe('without worktree tracker', () => {
    let service: SystemMetricsService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [SystemMetricsService],
      }).compile();

      service = module.get(SystemMetricsService);
    });

    test('returns zero active processes when tracker not available', async () => {
      const result = await service.getSystemSnapshot();

      expect(result.activeProcesses).toEqual({
        activeWorktreeCount: 0,
        lockedWorktrees: [],
        scope: 'process',
        totalWorktreeCount: 0,
      });
    });
  });

  describe('pressure level calculation', () => {
    let service: SystemMetricsService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [SystemMetricsService],
      }).compile();

      service = module.get(SystemMetricsService);
    });

    test('returns "high" when per-core load > 1.5', async () => {
      vi.mocked(os.loadavg).mockReturnValueOnce([16.0, 14.0, 12.0]);
      vi.mocked(os.cpus).mockReturnValueOnce(new Array(8).fill({}));

      const result = await service.getSystemSnapshot();

      expect(result.pressureLevel).toBe('high');
    });

    test('returns "moderate" when per-core load between 0.7 and 1.5', async () => {
      vi.mocked(os.loadavg).mockReturnValueOnce([8.0, 7.0, 6.0]);
      vi.mocked(os.cpus).mockReturnValueOnce(new Array(8).fill({}));

      const result = await service.getSystemSnapshot();

      expect(result.pressureLevel).toBe('moderate');
    });

    test('returns "low" when per-core load < 0.7', async () => {
      vi.mocked(os.loadavg).mockReturnValueOnce([2.0, 1.5, 1.0]);
      vi.mocked(os.cpus).mockReturnValueOnce(new Array(8).fill({}));

      const result = await service.getSystemSnapshot();

      expect(result.pressureLevel).toBe('low');
    });
  });
});

describe('readCgroupMetrics', () => {
  let service: SystemMetricsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SystemMetricsService],
    }).compile();
    service = module.get(SystemMetricsService);
    vi.mocked(os.platform).mockReturnValue('linux');
  });

  afterEach(() => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(fs.promises.readFile).mockReset();
  });

  test('is unavailable off Linux', async () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    const result = await service.readCgroupMetrics();
    expect(result).toEqual({
      kind: 'unavailable',
      reason: 'Not Linux (darwin)',
      scope: 'container',
    });
  });

  test('is unavailable on cgroup v1', async () => {
    serveFiles({ '/proc/self/cgroup': '12:memory:/docker/abc\n' });
    const result = await service.readCgroupMetrics();
    expect(result.kind).toBe('unavailable');
  });

  test('is unavailable when /proc/self/cgroup is unreadable', async () => {
    serveFiles({});
    const result = await service.readCgroupMetrics();
    expect(result.kind).toBe('unavailable');
  });

  test('is unavailable when no v2 hierarchy is mounted', async () => {
    serveFiles({ '/proc/self/cgroup': '0::/\n' });
    const result = await service.readCgroupMetrics();
    expect(result).toEqual({
      kind: 'unavailable',
      reason: 'cgroup v2 is not mounted at /sys/fs/cgroup',
      scope: 'container',
    });
  });

  test('reads a private-namespace container cgroup at the mount root', async () => {
    serveFiles({
      '/proc/self/cgroup': '0::/\n',
      '/sys/fs/cgroup/cgroup.controllers': 'cpu memory\n',
      '/sys/fs/cgroup/cpu.max': '75000 100000\n',
      '/sys/fs/cgroup/cpu.stat': `usage_usec 10\nnr_periods 4\nnr_throttled 1\nthrottled_usec 7\n`,
      '/sys/fs/cgroup/memory.current': '1024\n',
      '/sys/fs/cgroup/memory.max': '2048\n',
    });
    const result = await service.readCgroupMetrics();
    expect(result).toMatchObject({
      cpu: { limitVcpus: 0.75, nrThrottled: 1, usageUsec: 10 },
      kind: 'cgroup',
      memory: { currentBytes: 1024, events: null, limitBytes: 2048 },
      path: '/sys/fs/cgroup',
    });
  });

  test('reads a nested cgroup when its directory exists', async () => {
    serveFiles({
      '/proc/self/cgroup': '0::/system.slice/ot.service\n',
      '/sys/fs/cgroup/cgroup.controllers': 'cpu memory\n',
      '/sys/fs/cgroup/system.slice/ot.service/cgroup.controllers': `cpu memory\n`,
      '/sys/fs/cgroup/system.slice/ot.service/memory.current': '5\n',
    });
    const result = await service.readCgroupMetrics();
    expect(result).toMatchObject({
      kind: 'cgroup',
      path: '/sys/fs/cgroup/system.slice/ot.service',
    });
  });

  test('falls back to the mount root when the host-side path is not visible', async () => {
    serveFiles({
      '/proc/self/cgroup': '0::/docker/abc\n',
      '/sys/fs/cgroup/cgroup.controllers': 'cpu memory\n',
      '/sys/fs/cgroup/memory.current': '5\n',
    });
    const result = await service.readCgroupMetrics();
    expect(result).toMatchObject({ kind: 'cgroup', path: '/sys/fs/cgroup' });
  });
});

describe('getSystemSnapshot inside a CPU-limited cgroup', () => {
  let service: SystemMetricsService;
  const limitedFiles = (
    usageUsec: number,
    nrPeriods: number,
    nrThrottled: number,
  ) => {
    return {
      '/proc/pressure/cpu': `some avg10=90.00 avg60=90.00 avg300=90.00 total=1\n`,
      '/proc/self/cgroup': '0::/\n',
      '/sys/fs/cgroup/cgroup.controllers': 'cpu memory\n',
      '/sys/fs/cgroup/cpu.max': '50000 100000\n',
      '/sys/fs/cgroup/cpu.stat': `usage_usec ${usageUsec}\nnr_periods ${nrPeriods}\nnr_throttled ${nrThrottled}\nthrottled_usec 0\n`,
      '/sys/fs/cgroup/memory.current': '1024\n',
    };
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
    const module = await Test.createTestingModule({
      providers: [SystemMetricsService],
    }).compile();
    service = module.get(SystemMetricsService);
    vi.mocked(os.platform).mockReturnValue('linux');
  });

  afterEach(() => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    vi.mocked(fs.promises.readFile).mockReset();
  });

  test('bases pressure on the container, not the busy host', async () => {
    serveFiles(limitedFiles(1_000_000, 100, 0));
    const first = await service.getSystemSnapshot();
    expect(first.pressureBasis).toBe('container');
    expect(first.pressureLevel).toBe('unknown');

    vi.setSystemTime(FIXED_NOW.getTime() + 2000);
    serveFiles(limitedFiles(1_200_000, 120, 0));
    const second = await service.getSystemSnapshot();
    expect(second.container).toMatchObject({
      cpuWindow: { throttledPeriodRatio: 0, usageRatioOfLimit: 0.2 },
      kind: 'cgroup',
    });
    expect(second.pressureLevel).toBe('low');
  });

  test('reuses the last window for reads closer than a second', async () => {
    serveFiles(limitedFiles(1_000_000, 100, 0));
    await service.getSystemSnapshot();
    vi.setSystemTime(FIXED_NOW.getTime() + 2000);
    serveFiles(limitedFiles(2_000_000, 120, 12));
    const busy = await service.getSystemSnapshot();
    vi.setSystemTime(FIXED_NOW.getTime() + 2100);
    serveFiles(limitedFiles(2_000_100, 121, 12));
    const soon = await service.getSystemSnapshot();
    expect(busy.pressureLevel).toBe('high');
    expect(soon.container).toEqual(
      expect.objectContaining({
        cpuWindow:
          busy.container.kind === 'cgroup' ? busy.container.cpuWindow : null,
      }),
    );
  });
});
