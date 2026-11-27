import { createReadStream } from 'node:fs';

import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpCode,
  InternalServerErrorException,
  NotFoundException,
  Param,
  PayloadTooLargeException,
  Post,
  Req,
  StreamableFile,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AgentConversationMessageAttachmentsRepository } from '@openthrottle/nestjs-repositories-server';

import {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_STORE_FAILURE,
} from '../../services/attachment-store/attachment-store.constants.ts';
import { AttachmentStoreService } from '../../services/attachment-store/attachment-store.service.ts';
import { extensionForMimeType } from '../../services/attachment-store/attachment-store.utils.ts';
import {
  ATTACHMENT_CACHE_CONTROL,
  ATTACHMENT_UPLOAD_FIELD,
} from './attachments.constants.ts';
import type { AttachmentUploadResponse } from './attachments.types.ts';
import {
  isUuid,
  readAuthenticatedUserId,
  readUploadedImageFile,
} from './attachments.utils.ts';

/**
 * @description Upload and serve routes for chat image attachments. Both sit behind the global auth
 * guard (a read-only OAuth token is refused for the POST there); only a human user principal is
 * accepted, since every row is owned by a user. Bytes live in {@link AttachmentStoreService}, the
 * row (owner, original name) in the repository. multer buffers in memory with a parser-level size
 * limit, so an oversize body is cut off (413) before the controller runs.
 *
 * An unknown id, another user's id and a malformed id all answer 404, so the route is not an
 * oracle for which ids exist.
 */
@Controller('attachments')
export class AttachmentsController {
  constructor(
    private readonly attachmentsRepository: AgentConversationMessageAttachmentsRepository,
    private readonly attachmentStore: AttachmentStoreService,
  ) {}

  @Get(':id')
  @Header('Cache-Control', ATTACHMENT_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  async serve(
    @Param('id') id: string,
    @Req() req: unknown,
  ): Promise<StreamableFile> {
    const userId = readAuthenticatedUserId(req);
    if (!isUuid(id)) throw new NotFoundException();

    const row = await this.attachmentsRepository.findOwnedById(id, userId);
    const ext = row === null ? null : extensionForMimeType(row.mimeType);
    if (row === null || ext === null) throw new NotFoundException();

    const touched = await this.attachmentStore.touch(row.sha256, ext);
    if (!touched.ok) throw new NotFoundException();

    return new StreamableFile(createReadStream(touched.value), {
      disposition: 'inline',
      length: row.byteSize,
      type: row.mimeType,
    });
  }

  @HttpCode(201)
  @Post()
  @UseInterceptors(
    FileInterceptor(ATTACHMENT_UPLOAD_FIELD, {
      limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 },
    }),
  )
  async upload(
    @UploadedFile() file: unknown,
    @Req() req: unknown,
  ): Promise<AttachmentUploadResponse> {
    const userId = readAuthenticatedUserId(req);
    const upload = readUploadedImageFile(file);
    if (upload === null) {
      throw new BadRequestException(
        `Send one image in the multipart "${ATTACHMENT_UPLOAD_FIELD}" field.`,
      );
    }

    const stored = await this.attachmentStore.store(upload.buffer);
    if (!stored.ok) {
      if (stored.reason === ATTACHMENT_STORE_FAILURE.TOO_LARGE) {
        throw new PayloadTooLargeException(stored.message);
      }
      if (stored.reason === ATTACHMENT_STORE_FAILURE.UNSUPPORTED_TYPE) {
        throw new UnsupportedMediaTypeException(stored.message);
      }
      throw new InternalServerErrorException('Could not store the attachment.');
    }

    const row = await this.attachmentsRepository.create({
      byteSize: stored.value.byteSize,
      height: stored.value.height,
      mimeType: stored.value.mimeType,
      originalName: upload.originalName,
      sha256: stored.value.sha256,
      userId,
      width: stored.value.width,
    });

    return {
      byteSize: row.byteSize,
      height: row.height,
      id: row.id,
      mimeType: row.mimeType,
      sha256: row.sha256,
      width: row.width,
    };
  }
}
