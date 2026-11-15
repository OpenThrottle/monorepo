import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRedisModule } from '@openthrottle/nestjs-redis';

import { BackgroundActivityRegistryService } from './background-activity-registry.service.ts';

/**
 * @description Provides {@link BackgroundActivityRegistryService}. Safe under any PROCESS_ROLE:
 * producers (worker) and the `backgroundActivities` query (api) meet in Redis, not in memory.
 */
@Module({
  exports: [BackgroundActivityRegistryService],
  imports: [LoggerModule, NestjsRedisModule],
  providers: [BackgroundActivityRegistryService],
})
export class BackgroundActivityRegistryModule {}
