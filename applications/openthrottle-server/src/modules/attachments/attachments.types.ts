import type { AgentConversationMessageAttachmentMimeTypesValue } from '@openthrottle/nestjs-repositories-server';

/** What `POST /attachments` answers with. */
export interface AttachmentUploadResponse {
  readonly byteSize: number;
  readonly height: number | null;
  readonly id: string;
  readonly mimeType: AgentConversationMessageAttachmentMimeTypesValue;
  readonly sha256: string;
  readonly width: number | null;
}

/** The two fields of multer's in-memory file the controller reads. */
export interface UploadedImageFile {
  readonly buffer: Uint8Array;
  readonly originalName: string | null;
}
