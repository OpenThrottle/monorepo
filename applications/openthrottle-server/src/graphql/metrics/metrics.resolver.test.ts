/**
 * @description Unit tests for metrics resolver: metrics query, serverSnapshot, and recentPlanRunsMetrics. Mocks ProcessMetricsService and QueuesService.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { QueuesService } from '../queues/queues.service';
import { MetricsResolver } from './metrics.resolver';

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

  const mockQueuesService = createMock<QueuesService>({
    getCompletedJobsByPlanId: vi.fn().mockResolvedValue([]),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        MetricsResolver,
        { provide: ProcessMetricsService, useValue: mockProcessMetrics },
        { provide: QueuesService, useValue: mockQueuesService },
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
      expect(result[0].jobId).toBe('job-123');
      expect(result[0].finishedOn).toBe(1700000000000);
      expect(result[0].taskRunMetrics).not.toBeNull();
      expect(result[0].taskRunMetrics?.atStart.rssMb).toBe(50);
      expect(result[0].taskRunMetrics?.atEnd.rssMb).toBe(55);
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
});
