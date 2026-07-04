import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { DailyStatsQueueProducerModule } from './daily-stats-queue-producer.module';
import { DailyStatsProcessor } from './daily-stats.processor';
import { DailyStatsRepeatableService } from './daily-stats-repeatable.service';

/**
 * @description Processor half of the daily-stats queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all; enqueue-only consumers
 * import {@link DailyStatsQueueProducerModule} instead. The repeatable
 * registration lives with the processor so an api-only process doesn't create
 * schedules no worker in this prefix would consume.
 */
@Module({
  exports: [DailyStatsQueueProducerModule],
  imports: [
    DailyStatsQueueProducerModule,
    LoggerModule,
    NestjsRepositoriesModule,
    NotificationsModule,
  ],
  providers: [DailyStatsProcessor, DailyStatsRepeatableService],
})
export class DailyStatsQueueModule {}
