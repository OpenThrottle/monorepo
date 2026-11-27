/**
 * @description Provides {@link AttachmentStoreService}, the content-addressed image store under
 * `~/.openthrottle/attachments`. Import it where a controller or service needs to write or serve
 * attachments.
 */

import { Module } from '@nestjs/common';

import { AttachmentStoreService } from './attachment-store.service.ts';

@Module({
  exports: [AttachmentStoreService],
  providers: [AttachmentStoreService],
})
export class AttachmentStoreModule {}
