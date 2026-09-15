import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { NotificationsModule } from '../../notifications/notifications.module.ts';
import { DatabaseBackupProcessor } from './database-backup.processor.ts';
import { DatabaseBackupQueueProducerModule } from './database-backup-queue-producer.module.ts';
import { DatabaseBackupRepeatableService } from './database-backup-repeatable.service.ts';

/**
 * @description Processor half of the database-backup queue (WorkerHost +
 * repeatable scheduler). Loaded only under PROCESS_ROLE worker/all;
 * enqueue-only consumers import {@link DatabaseBackupQueueProducerModule}
 * instead. The repeatable registration lives with the processor so an api-only
 * process doesn't create schedules no worker in this prefix would consume.
 */
@Module({
  exports: [DatabaseBackupQueueProducerModule],
  imports: [
    DatabaseBackupQueueProducerModule,
    LoggerModule,
    NotificationsModule,
  ],
  providers: [DatabaseBackupProcessor, DatabaseBackupRepeatableService],
})
export class DatabaseBackupQueueModule {}
