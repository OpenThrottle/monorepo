/**
 * @description Service for server health checks: Cortex DB (via existing logic) and Redis (BullMQ PING).
 */

import { getCortexPostgresConfig } from '@openthrottle/ai-mcp/src/cortex-server';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PLANS_QUEUE_NAME } from '../../queues/plans/plans.constants';
import type { RunPlanJobData } from '../../queues/plans/plans.types';
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
    @InjectQueue(PLANS_QUEUE_NAME)
    private readonly plansQueue: Queue<RunPlanJobData, void>,
    private readonly plansService: PlansService,
  ) {}

  /**
   * @description Cortex DB status: ok if reachable, unconfigured if no config, unreachable on error.
   */
  async getDatabaseStatus(): Promise<ServerHealthStatus> {
    const config = getCortexPostgresConfig();

    if (!config) {
      return 'unconfigured';
    }

    try {
      const repo = this.plansService.getRepository();
      await repo.manager.query('SELECT 1');

      return 'ok';
    } catch {
      return 'unreachable';
    }
  }

  /**
   * @description Pings Redis used by BullMQ. Returns ok if PING succeeds, unconfigured if Redis env missing, unreachable on error.
   */
  async getRedisStatus(): Promise<ServerHealthStatus> {
    if (!process.env.REDIS_HOST) {
      return 'unconfigured';
    }

    try {
      const client = await this.plansQueue.client;
      await client.ping();

      return 'ok';
    } catch {
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
   * @description Returns server health: API (ok when invoked), Cortex DB, Redis, and WebSocket. Same shape as GraphQL serverHealth and REST GET /health.
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
