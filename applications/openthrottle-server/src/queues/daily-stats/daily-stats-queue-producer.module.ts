import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { DAILY_STATS_QUEUE_NAME } from './daily-stats.constants';

/**
 * @description Producer half of the daily-stats queue: registerQueue (enqueue
 * capability) + Bull Board listing, no WorkerHost. Safe under any PROCESS_ROLE;
 * the processor and repeatable scheduler live in {@link DailyStatsQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(DAILY_STATS_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DAILY_STATS_QUEUE_NAME),
  ],
})
export class DailyStatsQueueProducerModule {}
