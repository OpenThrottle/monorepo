import type { AgentConversationMessageAttachmentMimeTypesValue } from '@openthrottle/nestjs-repositories-server';

import type {
  ATTACHMENT_STORE_FAILURE,
  AttachmentExtensionValue,
} from './attachment-store.constants.ts';

/** Success or a reasoned failure; validation problems are values, never throws. */
export type AttachmentResult<TValue, TReason extends string> =
  | { readonly ok: true; readonly value: TValue }
  | {
      readonly message: string;
      readonly ok: false;
      readonly reason: TReason;
    };

export interface ImageDimensions {
  readonly height: number;
  readonly width: number;
}

export interface StoredAttachment {
  readonly byteSize: number;
  /** True when the bytes were already in the store (only the mtime moved). */
  readonly deduplicated: boolean;
  readonly ext: AttachmentExtensionValue;
  /** Null when the header could not be read cheaply; never a reason to fail an upload. */
  readonly height: number | null;
  /** Derived from the sniffed type, never from the client. */
  readonly mimeType: AgentConversationMessageAttachmentMimeTypesValue;
  readonly sha256: string;
  readonly width: number | null;
}

export type AttachmentStoreResult = AttachmentResult<
  StoredAttachment,
  | typeof ATTACHMENT_STORE_FAILURE.IO_ERROR
  | typeof ATTACHMENT_STORE_FAILURE.TOO_LARGE
  | typeof ATTACHMENT_STORE_FAILURE.UNSUPPORTED_TYPE
>;

export type AttachmentResolveResult = AttachmentResult<
  string,
  | typeof ATTACHMENT_STORE_FAILURE.INVALID_EXT
  | typeof ATTACHMENT_STORE_FAILURE.INVALID_SHA
  | typeof ATTACHMENT_STORE_FAILURE.IO_ERROR
  | typeof ATTACHMENT_STORE_FAILURE.NOT_FOUND
  | typeof ATTACHMENT_STORE_FAILURE.NOT_REGULAR_FILE
  | typeof ATTACHMENT_STORE_FAILURE.OUTSIDE_ROOT
>;
