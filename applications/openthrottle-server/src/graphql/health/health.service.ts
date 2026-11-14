/**
 * @description Service for server health checks: OpenThrottle DB (via existing logic), the cms DB
 * (its named DataSource) and Redis (BullMQ PING).
 */
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { REDIS_CLIENT } from '@openthrottle/nestjs-redis';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { CMS_CONNECTION } from '@openthrottle/nestjs-repositories-cms';
import {
  getCmsPostgresUrl,
  getPostgresUrl,
} from '@openthrottle/openthrottle-agentic-utils';
import type { Redis } from 'ioredis';
import { DataSource } from 'typeorm';

import { getServerVersion } from '../server-info/server-info.utils.ts';
import type { ServerHealthResponse } from './health.types.ts';
import type { ServerHealthStatus } from './server-health.object.ts';

@Injectable()
export class HealthService {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis | null,
    private readonly plansService: PlansService,
    private readonly logger: LoggerService,
    @InjectDataSource(CMS_CONNECTION)
    private readonly cmsDataSource: DataSource,
  ) {}

  /**
   * @description cms DB status: ok if its DataSource answers SELECT 1, unconfigured if no cms URL
   * resolves, unreachable on error.
   */
  async getCmsStatus(): Promise<ServerHealthStatus> {
    if (!getCmsPostgresUrl().ok) {
      return 'unconfigured';
    }

    try {
      await this.cmsDataSource.query('SELECT 1');

      return 'ok';
    } catch (error: unknown) {
      this.logger.warn(
        `cms database health check failed: ${error instanceof Error ? error.message : String(error)}`,
        HealthService.name,
      );

      return 'unreachable';
    }
  }

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
   * @description Returns server health: API (ok when invoked), OpenThrottle DB, cms DB, Redis, WebSocket, and the server package.json version. Same shape as GraphQL serverHealth and REST GET /health.
   */
  async getServerHealth(): Promise<ServerHealthResponse> {
    const [cms, database, redis, websocket] = await Promise.all([
      this.getCmsStatus(),
      this.getDatabaseStatus(),
      this.getRedisStatus(),
      this.getWebsocketStatus(),
    ]);

    return {
      api: 'ok',
      cms,
      database,
      redis,
      version: getServerVersion(),
      websocket,
    };
  }
}
