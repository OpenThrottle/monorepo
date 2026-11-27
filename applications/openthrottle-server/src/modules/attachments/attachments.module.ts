import { Module } from '@nestjs/common';
import { AgentConversationMessageAttachmentsModule } from '@openthrottle/nestjs-repositories-server';

import { AttachmentStoreModule } from '../../services/attachment-store/attachment-store.module.ts';
import { AttachmentsController } from './attachments.controller.ts';

/**
 * @description REST upload and serve routes for chat image attachments (`/attachments`). Auth is
 * the global guard's; nothing here is public.
 */
@Module({
  controllers: [AttachmentsController],
  imports: [AgentConversationMessageAttachmentsModule, AttachmentStoreModule],
})
export class AttachmentsModule {}
