/**
 * @description Unit tests for HealthService: database (ok/unconfigured/unreachable),
 * redis (ok/unconfigured/unreachable), websocket, and aggregated server health.
 */

import { createMock } from '@golevelup/ts-vitest';
import { getQueueToken } from '@nestjs/bullmq';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { Test } from '@nestjs/testing';
import type { Queue } from 'bullmq';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import { HealthService } from './health.service';

const getPostgresUrl = vi.fn<() => string | undefined>();
vi.mock('@openthrottle/openthrottle-agentic-utils', () => ({
  getPostgresUrl: () => getPostgresUrl(),
}));

describe('HealthService', () => {
  let service: HealthService;
  let plansService: PlansService;
  let query: ReturnType<typeof vi.fn>;
  let ping: ReturnType<typeof vi.fn>;
  let plansQueue: Queue;
  const originalRedisHost = process.env.REDIS_HOST;

  beforeEach(async () => {
    query = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    ping = vi.fn().mockResolvedValue('PONG');

    plansQueue = createMock<Queue>({
      client: Promise.resolve(createMock({ ping })),
    });

    const app = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: getQueueToken(PLANS_QUEUE_NAME),
          useValue: plansQueue,
        },
        {
          provide: PlansService,
          useValue: createMock<PlansService>({
            getRepository: vi.fn().mockReturnValue({ manager: { query } }),
          }),
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

  describe('getRedisStatus', () => {
    test('returns unconfigured when REDIS_HOST is unset', async () => {
      delete process.env.REDIS_HOST;

      await expect(service.getRedisStatus()).resolves.toBe('unconfigured');
    });

    test('returns ok when the client ping succeeds', async () => {
      await expect(service.getRedisStatus()).resolves.toBe('ok');
      expect(ping).toHaveBeenCalledTimes(1);
    });

    test('returns unreachable when the client ping throws', async () => {
      ping.mockRejectedValue(new Error('redis down'));

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
        database: 'ok',
        redis: 'ok',
        websocket: 'ok',
      });
    });

    test('reflects degraded subsystems in the aggregate', async () => {
      getPostgresUrl.mockReturnValue(undefined);
      ping.mockRejectedValue(new Error('redis down'));

      await expect(service.getServerHealth()).resolves.toEqual({
        api: 'ok',
        database: 'unconfigured',
        redis: 'unreachable',
        websocket: 'ok',
      });
    });
  });
});
