import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';

import { HealthService } from '../../graphql/health/health.service.ts';
import { HealthController } from './health.controller.ts';

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
    test('returns server health from HealthService (api, cms, database, redis, version, websocket)', async () => {
      vi.mocked(mockHealthService.getServerHealth).mockResolvedValueOnce({
        api: 'ok',
        cms: 'ok',
        database: 'ok',
        redis: 'ok',
        version: '1.2.3',
        websocket: 'ok',
      });

      const result = await controller.check();

      expect(result).toEqual({
        api: 'ok',
        cms: 'ok',
        database: 'ok',
        redis: 'ok',
        version: '1.2.3',
        websocket: 'ok',
      });
    });
  });
});
