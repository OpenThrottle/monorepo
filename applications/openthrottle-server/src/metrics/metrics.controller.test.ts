import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import type { ProcessMetricsSnapshot } from './process-metrics.types';
import type { SystemMetricsSnapshot } from './system-metrics.types';
import { MetricsController } from './metrics.controller';
import { ProcessMetricsService } from './process-metrics.service';
import { SystemMetricsService } from './system-metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;

  const mockProcessSnapshot: ProcessMetricsSnapshot = {
    cpuSystemMs: 8200,
    cpuUserMs: 125000,
    externalMb: 1.2,
    heapTotalMb: 48.5,
    heapUsedMb: 32.1,
    rssMb: 65.42,
  };

  const mockSystemSnapshot: SystemMetricsSnapshot = {
    activeProcesses: {
      activeWorktreeCount: 2,
      lockedWorktrees: ['job-123', 'job-456'],
      totalWorktreeCount: 4,
    },
    loadAverage: {
      cpuCount: 8,
      load15m: 1.5,
      load1m: 2.5,
      load5m: 2.0,
      perCoreLoad1m: 0.31,
    },
    platform: 'darwin',
    pressureLevel: 'low',
    psi: {
      full10s: null,
      full300s: null,
      full60s: null,
      some10s: null,
      some300s: null,
      some60s: null,
    },
    psiAvailable: false,
    timestamp: 1700000000000,
  };

  const mockProcessMetrics = createMock<ProcessMetricsService>({
    getCurrentSnapshot: vi.fn().mockReturnValue(mockProcessSnapshot),
  });

  const mockSystemMetrics = createMock<SystemMetricsService>({
    getSystemSnapshot: vi.fn().mockResolvedValue(mockSystemSnapshot),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        { provide: ProcessMetricsService, useValue: mockProcessMetrics },
        { provide: SystemMetricsService, useValue: mockSystemMetrics },
      ],
    }).compile();

    controller = app.get(MetricsController);
  });

  describe('getMetrics', () => {
    test('returns current process snapshot from ProcessMetricsService', () => {
      const result = controller.getMetrics();

      expect(mockProcessMetrics.getCurrentSnapshot).toHaveBeenCalledOnce();
      expect(result).toEqual(mockProcessSnapshot);
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

  describe('getSystemMetrics', () => {
    test('returns system metrics snapshot from SystemMetricsService', async () => {
      const result = await controller.getSystemMetrics();

      expect(mockSystemMetrics.getSystemSnapshot).toHaveBeenCalledOnce();
      expect(result).toEqual(mockSystemSnapshot);
      expect(result).toMatchObject({
        activeProcesses: {
          activeWorktreeCount: expect.any(Number),
          lockedWorktrees: expect.any(Array),
          totalWorktreeCount: expect.any(Number),
        },
        loadAverage: {
          cpuCount: expect.any(Number),
          load15m: expect.any(Number),
          load1m: expect.any(Number),
          load5m: expect.any(Number),
          perCoreLoad1m: expect.any(Number),
        },
        platform: expect.any(String),
        pressureLevel: expect.stringMatching(/^(low|moderate|high|unknown)$/),
        psiAvailable: expect.any(Boolean),
        timestamp: expect.any(Number),
      });
    });
  });
});
