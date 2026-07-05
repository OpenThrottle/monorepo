import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { DATABASE_BACKUP_QUEUE_NAME } from './database-backup.constants';

/**
 * @description Producer half of the database-backup queue: registerQueue
 * (enqueue capability) + Bull Board listing, no WorkerHost. Safe under any
 * PROCESS_ROLE; the processor and repeatable scheduler live in
 * {@link DatabaseBackupQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(DATABASE_BACKUP_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DATABASE_BACKUP_QUEUE_NAME),
  ],
})
export class DatabaseBackupQueueProducerModule {}
