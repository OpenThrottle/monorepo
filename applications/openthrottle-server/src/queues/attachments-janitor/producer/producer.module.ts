import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';

import { ATTACHMENTS_JANITOR_QUEUE_NAME } from '../attachments-janitor.constants.ts';

/**
 * @description Producer half of the attachments janitor queue: registerQueue + Bull Board, no
 * WorkerHost. The processor + repeatable scheduler live in {@link AttachmentsJanitorQueueModule}.
 */
@Module({
  exports: [BullModule],
  imports: [
    NestjsBullmqModule.registerQueue(ATTACHMENTS_JANITOR_QUEUE_NAME),
    NestjsBullmqBoardModule.forFeature(ATTACHMENTS_JANITOR_QUEUE_NAME),
  ],
})
export class AttachmentsJanitorQueueProducerModule {}
