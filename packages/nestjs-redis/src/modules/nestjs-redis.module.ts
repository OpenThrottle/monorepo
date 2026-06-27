import { Module, type OnApplicationShutdown } from '@nestjs/common';
import { LoggerModule, LoggerService } from '@openthrottle/nestjs-modules';
import { disconnectRedisCaches } from '../config/redis';

@Module({
  controllers: [],
  exports: [],
  imports: [LoggerModule],
  providers: [],
})
export class NestjsRedisModule implements OnApplicationShutdown {
  constructor(private readonly logger: LoggerService) {}

  /**
   * Close the Redis clients backing any caches created via `getRedisCache`
   * when the application shuts down, so connections are released cleanly
   * instead of being left dangling.
   */
  async onApplicationShutdown(): Promise<void> {
    await disconnectRedisCaches(this.logger);
  }
}
