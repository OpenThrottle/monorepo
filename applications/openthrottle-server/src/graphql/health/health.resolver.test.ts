/**
 * @description Unit tests for health resolver: databaseHealth, serverHealth, and serverMetrics. Mocks HealthService and ProcessMetricsService.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { ProcessMetricsService } from '../../metrics/process-metrics.service';
import { HealthResolver } from './health.resolver';
import { HealthService } from './health.service';

describe('HealthResolver', () => {
  let resolver: HealthResolver;

  const mockHealthService = createMock<HealthService>({
    getDatabaseStatus: vi.fn(),
    getServerHealth: vi.fn(),
  });

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

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        HealthResolver,
        { provide: HealthService, useValue: mockHealthService },
        { provide: ProcessMetricsService, useValue: mockProcessMetrics },
      ],
    }).compile();

    resolver = app.get<HealthResolver>(HealthResolver);

    vi.mocked(mockHealthService.getDatabaseStatus).mockReset();
    vi.mocked(mockHealthService.getServerHealth).mockReset();
    vi.mocked(mockProcessMetrics.getCurrentSnapshot).mockClear();
  });

  describe('databaseHealth', () => {
    test('returns unconfigured when HealthService returns unconfigured', async () => {
      vi.mocked(mockHealthService.getDatabaseStatus).mockResolvedValueOnce(
        'unconfigured',
      );

      const result = await resolver.databaseHealth();

      expect(result).toBe('unconfigured');
    });

    test('returns ok when HealthService returns ok', async () => {
      vi.mocked(mockHealthService.getDatabaseStatus).mockResolvedValueOnce(
        'ok',
      );

      const result = await resolver.databaseHealth();

      expect(result).toBe('ok');
    });

    test('returns unreachable when HealthService returns unreachable', async () => {
      vi.mocked(mockHealthService.getDatabaseStatus).mockResolvedValueOnce(
        'unreachable',
      );

      const result = await resolver.databaseHealth();

      expect(result).toBe('unreachable');
    });
  });

  describe('serverHealth', () => {
    test('returns object from HealthService.getServerHealth', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        apiStatus: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      });

      const result = await resolver.serverHealth();

      expect(result).toEqual({
        api: 'ok',
        apiStatus: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      });
    });

    test('returns database unconfigured when service returns unconfigured', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        database: 'unconfigured',
        redis: 'ok',
        websocket: 'ok',
      });

      const result = await resolver.serverHealth();

      expect(result.api).toBe('ok');
      expect(result.database).toBe('unconfigured');
      expect(result.redis).toBe('ok');
      expect(result.websocket).toBe('ok');
    });

    test('returns database unreachable when service returns unreachable', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        database: 'unreachable',
        redis: 'ok',
        websocket: 'ok',
      });

      const result = await resolver.serverHealth();

      expect(result.api).toBe('ok');
      expect(result.database).toBe('unreachable');
      expect(result.redis).toBe('ok');
      expect(result.websocket).toBe('ok');
    });

    test('returns redis unconfigured when service returns unconfigured', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        database: 'ok',
        redis: 'unconfigured',
        websocket: 'ok',
      });

      const result = await resolver.serverHealth();

      expect(result.api).toBe('ok');
      expect(result.database).toBe('ok');
      expect(result.redis).toBe('unconfigured');
      expect(result.websocket).toBe('ok');
    });

    test('returns redis unreachable when service returns unreachable', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        database: 'ok',
        redis: 'unreachable',
        websocket: 'ok',
      });

      const result = await resolver.serverHealth();

      expect(result.api).toBe('ok');
      expect(result.database).toBe('ok');
      expect(result.redis).toBe('unreachable');
      expect(result.websocket).toBe('ok');
    });
  });

  describe('serverMetrics', () => {
    test('returns process snapshot from ProcessMetricsService.getCurrentSnapshot', () => {
      const result = resolver.serverMetrics();

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
});
