import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { DOC_INGESTION_QUEUE_NAME } from './doc-ingestion.constants';

/**
 * @description Producer half of the doc-ingestion queue: registerQueue
 * (enqueue capability) + Bull Board listing, no WorkerHost. Safe under any
 * PROCESS_ROLE; the processor and repeatable scheduler live in
 * {@link DocIngestionQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(DOC_INGESTION_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(DOC_INGESTION_QUEUE_NAME),
  ],
})
export class DocIngestionQueueProducerModule {}
