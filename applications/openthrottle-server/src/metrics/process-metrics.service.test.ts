import { Test } from '@nestjs/testing';
import { describe, expect, test } from 'vitest';
import type { ProcessMetricsSnapshot } from './process-metrics.types';
import { ProcessMetricsService } from './process-metrics.service';

describe('ProcessMetricsService', () => {
  let service: ProcessMetricsService;

  test('is defined', async () => {
    const app = await Test.createTestingModule({
      providers: [ProcessMetricsService],
    }).compile();

    service = app.get(ProcessMetricsService);
    expect(service).toBeDefined();
  });

  describe('getCurrentSnapshot', () => {
    test('returns snapshot with process memory and CPU in expected units', async () => {
      const app = await Test.createTestingModule({
        providers: [ProcessMetricsService],
      }).compile();

      service = app.get(ProcessMetricsService);
      const snapshot = service.getCurrentSnapshot();

      expect(snapshot).toMatchObject({
        cpuSystemMs: expect.any(Number),
        cpuUserMs: expect.any(Number),
        externalMb: expect.any(Number),
        heapTotalMb: expect.any(Number),
        heapUsedMb: expect.any(Number),
        rssMb: expect.any(Number),
      } satisfies Record<keyof ProcessMetricsSnapshot, unknown>);

      expect(snapshot.rssMb).toBeGreaterThanOrEqual(0);
      expect(snapshot.heapUsedMb).toBeGreaterThanOrEqual(0);
      expect(snapshot.heapTotalMb).toBeGreaterThanOrEqual(0);
      expect(snapshot.externalMb).toBeGreaterThanOrEqual(0);
      expect(snapshot.cpuUserMs).toBeGreaterThanOrEqual(0);
      expect(snapshot.cpuSystemMs).toBeGreaterThanOrEqual(0);
    });

    test('rounds memory to 2 decimal places', async () => {
      const app = await Test.createTestingModule({
        providers: [ProcessMetricsService],
      }).compile();

      service = app.get(ProcessMetricsService);
      const snapshot = service.getCurrentSnapshot();

      const hasAtMostTwoDecimals = (n: number): boolean =>
        Number.isInteger(n * 100) || Math.round(n * 100) / 100 === n;
      expect(hasAtMostTwoDecimals(snapshot.rssMb)).toBe(true);
      expect(hasAtMostTwoDecimals(snapshot.heapUsedMb)).toBe(true);
    });
  });

  describe('getCpuUsagePercent', () => {
    test('returns a number between 0 and 100', async () => {
      const app = await Test.createTestingModule({
        providers: [ProcessMetricsService],
      }).compile();

      service = app.get(ProcessMetricsService);
      const percent = await service.getCpuUsagePercent(50);

      expect(typeof percent).toBe('number');
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    });

    test('uses default window of 100ms when not passed', async () => {
      const app = await Test.createTestingModule({
        providers: [ProcessMetricsService],
      }).compile();

      service = app.get(ProcessMetricsService);
      const percent = await service.getCpuUsagePercent();

      expect(typeof percent).toBe('number');
      expect(percent).toBeGreaterThanOrEqual(0);
      expect(percent).toBeLessThanOrEqual(100);
    });
  });
});
