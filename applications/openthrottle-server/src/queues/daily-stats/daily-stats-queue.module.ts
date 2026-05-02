import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NotificationsModule } from '../../notifications/notifications.module';
import { DAILY_STATS_QUEUE_NAME } from './daily-stats.constants';
import { DailyStatsProcessor } from './daily-stats.processor';
import { DailyStatsRepeatableService } from './daily-stats-repeatable.service';

@Module({
  exports: [BullModule],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(DAILY_STATS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DAILY_STATS_QUEUE_NAME),
    NestjsRepositoriesModule,
    NotificationsModule,
  ],
  providers: [DailyStatsProcessor, DailyStatsRepeatableService],
})
export class DailyStatsQueueModule {}
