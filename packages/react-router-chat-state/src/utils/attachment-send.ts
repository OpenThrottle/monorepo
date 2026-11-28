import { CHAT_ATTACHMENT_COPY } from '../data/copy';

/** Input to {@link getAttachmentSendBlocker}. @public */
export interface AttachmentSendState {
  /** Whether the selected model or backend takes image attachments. */
  readonly acceptsImages: boolean;
  readonly attachmentIds: readonly string[];
  /** Whether any attachment is still uploading. */
  readonly hasUploading: boolean;
}

/**
 * @description The reason attachments cannot be used with the selected model,
 * or `undefined` when they can. Feeds the composer's disabled-reason prop.
 *
 * @public
 */
export const getAttachmentsDisabledReason = (
  acceptsImages: boolean,
): string | undefined => {
  return acceptsImages ? undefined : CHAT_ATTACHMENT_COPY.unsupportedModel;
};

/**
 * @description The error to show instead of sending a turn, or `undefined`
 * when the attachments allow the send: uploads still running, or ready images
 * on a model that does not take them. One rule for the home composer and the
 * header chat dialog.
 *
 * @public
 */
export const getAttachmentSendBlocker = (
  state: AttachmentSendState,
): string | undefined => {
  if (state.hasUploading) {
    return CHAT_ATTACHMENT_COPY.uploadingBlocker;
  }
  if (state.attachmentIds.length > 0 && !state.acceptsImages) {
    return CHAT_ATTACHMENT_COPY.unsupportedModel;
  }
  return undefined;
};

/**
 * @description The turn fields that carry the attachments: only the ids ride
 * the turn, as a JSON array (like `fileMentions`). Empty when none are attached.
 *
 * @public
 */
export const buildAttachmentFields = (
  attachmentIds: readonly string[],
): Record<string, string> => {
  if (attachmentIds.length === 0) {
    return {};
  }
  return { attachmentIds: JSON.stringify(attachmentIds) };
};
