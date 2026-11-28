import { ImageOff } from 'lucide-react';
import * as React from 'react';

import { CHAT_MESSAGE_ATTACHMENT_COPY } from '../data/copy';
import type { ChatMessageAttachment as ChatMessageAttachmentValue } from '../types';
import { getChatAttachmentSrc } from '../utils/chat-attachments';

export interface ChatMessageAttachmentProps {
  readonly attachment: ChatMessageAttachmentValue;
  /** Called when the thumbnail is activated; the parent owns the preview. */
  readonly onOpen: (opener: HTMLElement) => void;
}

/**
 * @description One image thumbnail on a sent message, served from the
 * attachments resource route; activating it asks the parent to open the preview. A failed load
 * (deleted, not yours, offline) swaps in a "missing image" placeholder.
 */
export const ChatMessageAttachment = (
  props: ChatMessageAttachmentProps,
): React.ReactElement => {
  const { attachment, onOpen } = props;

  // Hooks
  const [hasFailed, setHasFailed] = React.useState(false);

  // Setup
  const src = getChatAttachmentSrc(attachment.id);
  const alt = attachment.originalName ?? CHAT_MESSAGE_ATTACHMENT_COPY.altFallback; // prettier-ignore

  // Handlers
  const onError = (): void => {
    setHasFailed(true);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (hasFailed) {
    return (
      <span
        aria-label={CHAT_MESSAGE_ATTACHMENT_COPY.missing}
        className="bg-muted text-muted-foreground flex size-24 flex-col items-center justify-center gap-1 rounded-md border text-xs"
        data-testid="ChatMessageAttachment-missing"
        role="img"
      >
        <ImageOff className="size-5" />
        {CHAT_MESSAGE_ATTACHMENT_COPY.missing}
      </span>
    );
  }

  return (
    <button
      className="rounded-md focus-visible:ring-2 focus-visible:outline-none"
      onClick={(event) => onOpen(event.currentTarget)}
      type="button"
    >
      <img
        alt={alt}
        className="max-h-40 max-w-48 rounded-md border object-cover"
        onError={onError}
        src={src}
      />
    </button>
  );
};
