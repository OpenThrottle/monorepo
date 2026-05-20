import { BullModule } from '@nestjs/bullmq';
import { DATABASE_BACKUP_QUEUE_NAME } from './database-backup.constants';
import { DatabaseBackupProcessor } from './database-backup.processor';
import { DatabaseBackupRepeatableService } from './database-backup-repeatable.service';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NotificationsModule } from '../../notifications/notifications.module';

@Module({
  exports: [BullModule],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(DATABASE_BACKUP_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DATABASE_BACKUP_QUEUE_NAME),
    NotificationsModule,
  ],
  providers: [DatabaseBackupProcessor, DatabaseBackupRepeatableService],
})
export class DatabaseBackupQueueModule {}
