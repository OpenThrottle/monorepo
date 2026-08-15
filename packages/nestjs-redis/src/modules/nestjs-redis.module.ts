import { Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { LoggerModule, LoggerService } from '@openthrottle/nestjs-modules';
import type { Redis } from 'ioredis';
import {
  createRedisClient,
  disconnectRedisClient,
} from '../config/redis-client';
import { disconnectRedisCaches } from '../config/redis';
import { REDIS_CLIENT } from './redis-client.token';

@Module({
  controllers: [],
  exports: [REDIS_CLIENT],
  imports: [LoggerModule],
  providers: [
    {
      inject: [LoggerService],
      provide: REDIS_CLIENT,
      useFactory: (logger: LoggerService): Redis | null =>
        createRedisClient(logger),
    },
  ],
})
export class NestjsRedisModule implements OnApplicationShutdown {
  constructor(
    private readonly logger: LoggerService,
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis | null,
  ) {}

  /**
   * Close the shared ioredis client and the Redis clients backing any caches
   * created via `getRedisCache` when the application shuts down, so all
   * connections are released cleanly instead of being left dangling.
   */
  async onApplicationShutdown(): Promise<void> {
    await Promise.all([
      disconnectRedisClient(this.redisClient, this.logger),
      disconnectRedisCaches(this.logger),
    ]);
  }
}
