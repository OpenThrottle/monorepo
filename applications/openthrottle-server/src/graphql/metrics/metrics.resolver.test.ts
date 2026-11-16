/**
 * @description Unit tests for metrics resolver: metrics query, serverSnapshot, and recentPlanRunsMetrics. Mocks ProcessMetricsService and QueuesService.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import { ProcessMetricsService } from '../../metrics/process-metrics/process-metrics.service.ts';
import { SystemMetricsService } from '../../metrics/system-metrics/system-metrics.service.ts';
import type { SystemMetricsSnapshot } from '../../metrics/system-metrics/system-metrics.types.ts';
import { QueuesService } from '../queues/queues-service/queues-service.service.ts';
import { MetricsResolver } from './metrics.resolver.ts';

describe('MetricsResolver', () => {
  let resolver: MetricsResolver;

  const mockSnapshot = {
    cpuSystemMs: 5000,
    cpuUserMs: 100000,
    externalMb: 0.8,
    heapTotalMb: 40,
    heapUsedMb: 28.2,
    rssMb: 50.5,
  };

  const mockProcessMetrics = createMock<ProcessMetricsService>({
    getCurrentSnapshot: vi.fn().mockReturnValue(mockSnapshot),
  });

  const mockSystemSnapshot: SystemMetricsSnapshot = {
    activeProcesses: {
      activeWorktreeCount: 1,
      lockedWorktrees: ['job-1'],
      scope: 'process',
      totalWorktreeCount: 2,
    },
    container: {
      cpu: {
        limitVcpus: 0.75,
        nrPeriods: 10,
        nrThrottled: 2,
        throttledUsec: 300,
        usageUsec: 4000,
      },
      cpuWindow: {
        elapsedMs: 2000,
        throttledPeriodRatio: 0.2,
        usageRatioOfLimit: 0.5,
        usedVcpus: 0.375,
      },
      kind: 'cgroup',
      memory: {
        currentBytes: 100,
        events: { high: 0, max: 0, oom: 0, oomKill: 1 },
        highBytes: null,
        limitBytes: 671088640,
      },
      path: '/sys/fs/cgroup',
      psi: {
        full10s: 0,
        full300s: 0,
        full60s: 0,
        fullTotalUs: 1,
        scope: 'container',
        some10s: 1,
        some300s: 1,
        some60s: 1,
        someTotalUs: 2,
      },
      scope: 'container',
    },
    hostMemory: {
      freeBytes: 4,
      scope: 'host',
      totalBytes: 16,
      usedRatio: 0.75,
    },
    loadAverage: {
      cpuCount: 2,
      load15m: 1,
      load1m: 1,
      load5m: 1,
      perCoreLoad1m: 0.5,
      scope: 'host',
    },
    platform: 'linux',
    pressureBasis: 'container',
    pressureLevel: 'moderate',
    psi: {
      full10s: null,
      full300s: null,
      full60s: null,
      fullTotalUs: null,
      scope: 'host',
      some10s: 3,
      some300s: 3,
      some60s: 3,
      someTotalUs: 9,
    },
    psiAvailable: true,
    timestamp: 1700000000000,
  };

  const mockSystemMetrics = createMock<SystemMetricsService>({
    getSystemSnapshot: vi.fn().mockResolvedValue(mockSystemSnapshot),
  });

  const mockQueuesService = createMock<QueuesService>({
    getCompletedJobsByPlanId: vi.fn().mockResolvedValue([]),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        MetricsResolver,
        { provide: ProcessMetricsService, useValue: mockProcessMetrics },
        { provide: QueuesService, useValue: mockQueuesService },
        { provide: SystemMetricsService, useValue: mockSystemMetrics },
      ],
    }).compile();

    resolver = app.get<MetricsResolver>(MetricsResolver);

    vi.mocked(mockProcessMetrics.getCurrentSnapshot).mockClear();
    vi.mocked(mockQueuesService.getCompletedJobsByPlanId).mockClear();
  });

  describe('metrics', () => {
    test('returns MetricsObject (root for namespace)', () => {
      const result = resolver.metrics();

      expect(result).toEqual({});
    });
  });

  describe('serverSnapshot', () => {
    test('returns process snapshot from ProcessMetricsService.getCurrentSnapshot', () => {
      const result = resolver.serverSnapshot();

      expect(mockProcessMetrics.getCurrentSnapshot).toHaveBeenCalledOnce();
      expect(result).toEqual(mockSnapshot);
      expect(result).toMatchObject({
        cpuSystemMs: expect.any(Number),
        cpuUserMs: expect.any(Number),
        externalMb: expect.any(Number),
        heapTotalMb: expect.any(Number),
        heapUsedMb: expect.any(Number),
        rssMb: expect.any(Number),
      });
    });
  });

  describe('recentPlanRunsMetrics', () => {
    test('calls QueuesService.getCompletedJobsByPlanId with planId and capped limit', async () => {
      vi.mocked(mockQueuesService.getCompletedJobsByPlanId).mockResolvedValue(
        [],
      );

      const result = await resolver.recentPlanRunsMetrics('plan-uuid', 5);

      expect(mockQueuesService.getCompletedJobsByPlanId).toHaveBeenCalledWith(
        'plan-uuid',
        5,
      );
      expect(result).toEqual([]);
    });

    test('maps job DTOs to PlanRunMetricsEntryObject with taskRunMetrics', async () => {
      const jobDto = {
        data: JSON.stringify({ planId: 'plan-1' }),
        executionBackend: null,
        failedReason: null,
        finishedOn: 1700000000000,
        id: 'job-123',
        name: 'run-plan',
        processedOn: 1699999990000,
        progress: 100,
        returnvalue: JSON.stringify({
          taskRunMetrics: {
            atEnd: {
              cpuSystemMs: 8,
              cpuUserMs: 150,
              externalMb: 0.6,
              heapTotalMb: 42,
              heapUsedMb: 30,
              rssMb: 55,
            },
            atStart: {
              cpuSystemMs: 5,
              cpuUserMs: 100,
              externalMb: 0.5,
              heapTotalMb: 40,
              heapUsedMb: 28,
              rssMb: 50,
            },
          },
        }),
        state: 'completed',
        timestamp: 1699999980000,
      };
      vi.mocked(mockQueuesService.getCompletedJobsByPlanId).mockResolvedValue([
        jobDto,
      ]);

      const result = await resolver.recentPlanRunsMetrics('plan-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0]?.jobId).toBe('job-123');
      expect(result[0]?.finishedOn).toBe(1700000000000);
      expect(result[0]?.taskRunMetrics).not.toBeNull();
      expect(result[0]?.taskRunMetrics?.atStart.rssMb).toBe(50);
      expect(result[0]?.taskRunMetrics?.atEnd.rssMb).toBe(55);
    });

    test('uses default limit when limit is null', async () => {
      vi.mocked(mockQueuesService.getCompletedJobsByPlanId).mockResolvedValue(
        [],
      );

      await resolver.recentPlanRunsMetrics('plan-uuid', null);

      expect(mockQueuesService.getCompletedJobsByPlanId).toHaveBeenCalledWith(
        'plan-uuid',
        10,
      );
    });
  });

  describe('systemSnapshot', () => {
    test('maps the live snapshot with every group scoped', async () => {
      const result = await resolver.systemSnapshot();

      expect(result.pressureBasis).toBe('container');
      expect(result.hostMemory.scope).toBe('host');
      expect(result.loadAverage.scope).toBe('host');
      expect(result.activeProcesses.scope).toBe('process');
      expect(result.container).toMatchObject({
        available: true,
        cpu: { limitVcpus: 0.75, nrThrottled: 2 },
        cpuWindow: { throttledPeriodRatio: 0.2 },
        memory: { events: { oomKill: 1 }, limitBytes: 671088640 },
        psi: { scope: 'container' },
        scope: 'container',
        unavailableReason: null,
      });
    });

    test('flattens an unavailable cgroup', async () => {
      vi.mocked(mockSystemMetrics.getSystemSnapshot).mockResolvedValueOnce({
        ...mockSystemSnapshot,
        container: {
          kind: 'unavailable',
          reason: 'Not Linux (darwin)',
          scope: 'container',
        },
        pressureBasis: 'host',
      });

      const result = await resolver.systemSnapshot();

      expect(result.container).toEqual({
        available: false,
        cpu: null,
        cpuWindow: null,
        memory: null,
        path: null,
        psi: null,
        scope: 'container',
        unavailableReason: 'Not Linux (darwin)',
      });
    });
  });
});
