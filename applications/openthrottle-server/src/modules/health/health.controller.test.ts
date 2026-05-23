import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { HealthService } from '../../graphql/health/health.service';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthService = createMock<HealthService>({
    getServerHealth: vi.fn(),
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = app.get<HealthController>(HealthController);
  });

  describe('check', () => {
    test('returns server health from HealthService (api, database, redis, websocket)', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        apiStatus: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      });

      const result = await controller.check();

      expect(result).toEqual({
        api: 'ok',
        apiStatus: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      });
    });
  });
});
