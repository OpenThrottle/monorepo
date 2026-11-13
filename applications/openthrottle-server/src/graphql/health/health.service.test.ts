/**
 * @description Unit tests for HealthService: database (ok/unconfigured/unreachable),
 * redis (ok/unconfigured/unreachable), websocket, and aggregated server health.
 */

import { createMock, type DeepMocked } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { REDIS_CLIENT } from '@openthrottle/nestjs-redis';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { CMS_CONNECTION } from '@openthrottle/nestjs-repositories-cms';
import type { Redis } from 'ioredis';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { HealthService } from './health.service.ts';

const getPostgresUrl = vi.fn<() => string | undefined>();
const getCmsPostgresUrl = vi.fn<() => { readonly ok: boolean }>();
vi.mock('@openthrottle/openthrottle-agentic-utils', () => ({
  getCmsPostgresUrl: () => getCmsPostgresUrl(),
  getPostgresUrl: () => getPostgresUrl(),
}));

describe('HealthService', () => {
  let service: HealthService;
  let plansService: PlansService;
  let query: ReturnType<typeof vi.fn>;
  let cmsQuery: ReturnType<typeof vi.fn>;
  let redis: DeepMocked<Redis>;
  const originalRedisHost = process.env.REDIS_HOST;

  beforeEach(async () => {
    query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    cmsQuery = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    redis = createMock<Redis>();
    redis.ping.mockResolvedValue('PONG');

    const app = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: REDIS_CLIENT,
          useValue: redis,
        },
        {
          provide: PlansService,
          useValue: createMock<PlansService>({
            getRepository: vi.fn().mockReturnValue({ manager: { query } }),
          }),
        },
        {
          provide: getDataSourceToken(CMS_CONNECTION),
          useValue: { query: cmsQuery },
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>({ warn: vi.fn() }),
        },
      ],
    }).compile();

    service = app.get<HealthService>(HealthService);
    plansService = app.get<PlansService>(PlansService);

    getPostgresUrl.mockReturnValue('postgres://localhost/test');
    getCmsPostgresUrl.mockReturnValue({ ok: true });
    process.env.REDIS_HOST = 'localhost';
  });

  afterEach(() => {
    if (originalRedisHost === undefined) {
      delete process.env.REDIS_HOST;
    } else {
      process.env.REDIS_HOST = originalRedisHost;
    }
    vi.clearAllMocks();
  });

  describe('getDatabaseStatus', () => {
    test('returns unconfigured when no postgres url is configured', async () => {
      getPostgresUrl.mockReturnValue(undefined);

      await expect(service.getDatabaseStatus()).resolves.toBe('unconfigured');
      expect(plansService.getRepository).not.toHaveBeenCalled();
    });

    test('returns ok when SELECT 1 succeeds', async () => {
      await expect(service.getDatabaseStatus()).resolves.toBe('ok');
      expect(query).toHaveBeenCalledWith('SELECT 1');
    });

    test('returns unreachable when the query throws', async () => {
      query.mockRejectedValue(new Error('connection refused'));

      await expect(service.getDatabaseStatus()).resolves.toBe('unreachable');
    });
  });

  describe('getCmsStatus', () => {
    test('returns unconfigured when no cms url resolves', async () => {
      getCmsPostgresUrl.mockReturnValue({ ok: false });

      await expect(service.getCmsStatus()).resolves.toBe('unconfigured');
      expect(cmsQuery).not.toHaveBeenCalled();
    });

    test('returns ok when SELECT 1 succeeds on the cms DataSource', async () => {
      await expect(service.getCmsStatus()).resolves.toBe('ok');
      expect(cmsQuery).toHaveBeenCalledWith('SELECT 1');
      expect(query).not.toHaveBeenCalled();
    });

    test('returns unreachable when the cms query throws', async () => {
      cmsQuery.mockRejectedValue(new Error('connection refused'));

      await expect(service.getCmsStatus()).resolves.toBe('unreachable');
    });
  });

  describe('getRedisStatus', () => {
    test('returns unconfigured when REDIS_HOST is unset', async () => {
      delete process.env.REDIS_HOST;

      await expect(service.getRedisStatus()).resolves.toBe('unconfigured');
    });

    test('returns ok when the client ping succeeds', async () => {
      await expect(service.getRedisStatus()).resolves.toBe('ok');
      expect(redis.ping).toHaveBeenCalledTimes(1);
    });

    test('returns unreachable when the client ping throws', async () => {
      redis.ping.mockRejectedValue(new Error('redis down'));

      await expect(service.getRedisStatus()).resolves.toBe('unreachable');
    });
  });

  describe('getWebsocketStatus', () => {
    test('always returns ok', async () => {
      await expect(service.getWebsocketStatus()).resolves.toBe('ok');
    });
  });

  describe('getServerHealth', () => {
    test('aggregates api/database/redis/websocket statuses', async () => {
      await expect(service.getServerHealth()).resolves.toEqual({
        api: 'ok',
        cms: 'ok',
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      });
    });

    test('reflects degraded subsystems in the aggregate', async () => {
      getPostgresUrl.mockReturnValue(undefined);
      cmsQuery.mockRejectedValue(new Error('cms down'));
      redis.ping.mockRejectedValue(new Error('redis down'));

      await expect(service.getServerHealth()).resolves.toEqual({
        api: 'ok',
        cms: 'unreachable',
        database: 'unconfigured',
        redis: 'unreachable',
        websocket: 'ok',
      });
    });
  });
});
