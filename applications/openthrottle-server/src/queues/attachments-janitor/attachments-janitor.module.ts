import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AgentConversationMessageAttachmentsModule } from '@openthrottle/nestjs-repositories-server';

import { AttachmentStoreModule } from '../../services/attachment-store/attachment-store.module.ts';
import { AttachmentsJanitorProcessor } from './attachments-janitor.processor.ts';
import { AttachmentsJanitorQueueProducerModule } from './producer/producer.module.ts';
import { AttachmentsJanitorRepeatableService } from './repeatable/repeatable.service.ts';

/**
 * @description Processor half of the attachments janitor queue (WorkerHost + repeatable
 * scheduler). Loaded only under PROCESS_ROLE worker/all, so an api-only process never registers an
 * orphan schedule.
 */
@Module({
  exports: [AttachmentsJanitorQueueProducerModule],
  imports: [
    AgentConversationMessageAttachmentsModule,
    AttachmentsJanitorQueueProducerModule,
    AttachmentStoreModule,
    LoggerModule,
  ],
  providers: [AttachmentsJanitorProcessor, AttachmentsJanitorRepeatableService],
})
export class AttachmentsJanitorQueueModule {}
