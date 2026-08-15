/**
 * @description Service for server health checks: OpenThrottle DB (via existing logic) and Redis (BullMQ PING).
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { REDIS_CLIENT } from '@openthrottle/nestjs-redis';
import { PlansService } from '@openthrottle/nestjs-repositories';
import type { Redis } from 'ioredis';
import type { ServerHealthStatus } from './server-health.object';

export interface ServerHealthResponse {
  readonly api: string;
  readonly database: ServerHealthStatus;
  readonly redis: ServerHealthStatus;
  readonly websocket: ServerHealthStatus;
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
    private readonly plansService: PlansService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * @description Database status: ok if reachable, unconfigured if no config, unreachable on error.
   */
  async getDatabaseStatus(): Promise<ServerHealthStatus> {
    const url = getPostgresUrl();
    if (!url) {
      return 'unconfigured';
    }

    try {
      const repo = this.plansService.getRepository();
      await repo.manager.query('SELECT 1');

      return 'ok';
    } catch (error: unknown) {
      this.logger.warn(
        `Database health check failed: ${error instanceof Error ? error.message : String(error)}`,
        HealthService.name,
      );

      return 'unreachable';
    }
  }

  /**
   * @description Pings Redis via the dedicated control-plane client. Returns ok if PING succeeds, unconfigured if Redis env missing, unreachable on error.
   */
  async getRedisStatus(): Promise<ServerHealthStatus> {
    if (!process.env.REDIS_HOST || this.redis === null) {
      return 'unconfigured';
    }

    try {
      await this.redis.ping();

      return 'ok';
    } catch (error: unknown) {
      this.logger.warn(
        `Redis health check failed: ${error instanceof Error ? error.message : String(error)}`,
        HealthService.name,
      );

      return 'unreachable';
    }
  }

  /**
   * @description WebSocket (Socket.IO) status. Returns ok when the server process is running (WS shares the same process).
   */
  async getWebsocketStatus(): Promise<ServerHealthStatus> {
    return 'ok';
  }

  /**
   * @description Returns server health: API (ok when invoked), OpenThrottle DB, Redis, and WebSocket. Same shape as GraphQL serverHealth and REST GET /health.
   */
  async getServerHealth(): Promise<ServerHealthResponse> {
    const [database, redis, websocket] = await Promise.all([
      this.getDatabaseStatus(),
      this.getRedisStatus(),
      this.getWebsocketStatus(),
    ]);

    return {
      api: 'ok',
      database,
      redis,
      websocket,
    };
  }
}
