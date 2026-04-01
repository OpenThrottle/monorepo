import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { DOC_INGESTION_QUEUE_NAME } from './doc-ingestion.constants';
import { DocIngestionProcessor } from './doc-ingestion.processor';
import { DocIngestionRepeatableService } from './doc-ingestion-repeatable.service';

@Module({
  exports: [BullModule],
  imports: [
    LoggerModule,
    NestjsBullmqModule.registerQueue(DOC_INGESTION_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DOC_INGESTION_QUEUE_NAME),
  ],
  providers: [DocIngestionProcessor, DocIngestionRepeatableService],
})
export class DocIngestionQueueModule {}
