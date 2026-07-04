import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { DocIngestionQueueProducerModule } from './doc-ingestion-queue-producer.module';
import { DocIngestionProcessor } from './doc-ingestion.processor';
import { DocIngestionRepeatableService } from './doc-ingestion-repeatable.service';

/**
 * @description Processor half of the doc-ingestion queue (WorkerHost +
 * repeatable scheduler). Loaded only under PROCESS_ROLE worker/all;
 * enqueue-only consumers import {@link DocIngestionQueueProducerModule}
 * instead. The repeatable registration lives with the processor so an api-only
 * process doesn't create schedules no worker in this prefix would consume.
 */
@Module({
  exports: [DocIngestionQueueProducerModule],
  imports: [DocIngestionQueueProducerModule, LoggerModule],
  providers: [DocIngestionProcessor, DocIngestionRepeatableService],
})
export class DocIngestionQueueModule {}
