import * as os from 'os';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import type { IWorktreeTargetsTracker } from '@openthrottle/nestjs-worktrees';
import { WORKTREE_TRACKER_TOKEN } from '@openthrottle/nestjs-worktrees';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SystemMetricsService } from './system-metrics.service';

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
        some10s: null,
        some300s: null,
        some60s: null,
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
        totalWorktreeCount: 4,
      });
      expect(mockWorktreeTracker.listTargets).toHaveBeenCalled();
    });

    test('returns timestamp', async () => {
      const before = Date.now();
      const result = await service.getSystemSnapshot();
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
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
