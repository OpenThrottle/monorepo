import { CHAT_ATTACHMENT_UPLOAD_ROUTE } from '../data/chat-attachments';

/** Where a persisted attachment's bytes are served (`GET`). @public */
export const getChatAttachmentSrc = (attachmentId: string): string => {
  return `${CHAT_ATTACHMENT_UPLOAD_ROUTE}/${encodeURIComponent(attachmentId)}`;
};

/** Keeps only the image files of a pasted / dropped / picked list. @public */
export const pickImageFiles = (files: Iterable<File>): File[] => {
  return Array.from(files).filter((file) => file.type.startsWith('image/'));
};

/** Whether a drag carries files (as opposed to text or a link). @public */
export const hasDraggedFiles = (transfer: DataTransfer): boolean => {
  return Array.from(transfer.types).includes('Files');
};
