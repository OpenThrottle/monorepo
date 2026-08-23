import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { DATA_RETENTION_QUEUE_NAME } from './data-retention.constants';

/**
 * @description Producer half of the data-retention queue: registerQueue + Bull Board,
 * no WorkerHost. Safe under any PROCESS_ROLE; the processor + repeatable scheduler live
 * in {@link DataRetentionQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(DATA_RETENTION_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DATA_RETENTION_QUEUE_NAME),
  ],
})
export class DataRetentionQueueProducerModule {}
