import { isRecord } from '@openthrottle/nodejs-utils';
import { CHAT_ATTACHMENT_UPLOAD_ROUTE } from '@openthrottle/react-router-chat';

import { HOME_ATTACHMENT_COPY } from '~/routing/home/data/copy';

/**
 * Outcome of one image upload; failures are values (with the message the chip
 * shows), never thrown.
 */
export type UploadComposerAttachmentResult =
  | { readonly error: string; readonly ok: false }
  | { readonly id: string; readonly ok: true };

const toFailureMessage = (status: number): string => {
  if (status === 413) {
    return HOME_ATTACHMENT_COPY.tooLarge;
  }
  if (status === 415) {
    return HOME_ATTACHMENT_COPY.unsupportedFormat;
  }
  if (status === 401) {
    return HOME_ATTACHMENT_COPY.signedOut;
  }

  return HOME_ATTACHMENT_COPY.failed;
};

/**
 * @description Uploads one image to the `/resources/attachments` proxy and
 * returns the server attachment id, or the user-facing reason it failed
 * (413 too large, 415 wrong format, 401 signed out, anything else generic).
 */
export const uploadComposerAttachment = async (
  file: File,
): Promise<UploadComposerAttachmentResult> => {
  const body = new FormData();
  body.append('file', file, file.name);

  try {
    const response = await fetch(CHAT_ATTACHMENT_UPLOAD_ROUTE, {
      body,
      method: 'POST',
    });
    if (!response.ok) {
      return { error: toFailureMessage(response.status), ok: false };
    }

    const json: unknown = await response.json();
    if (!isRecord(json) || typeof json.id !== 'string') {
      return { error: HOME_ATTACHMENT_COPY.failed, ok: false };
    }

    return { id: json.id, ok: true };
  } catch {
    return { error: HOME_ATTACHMENT_COPY.failed, ok: false };
  }
};
