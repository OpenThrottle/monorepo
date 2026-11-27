import { ImageOff } from 'lucide-react';
import * as React from 'react';

import { CHAT_MESSAGE_ATTACHMENT_COPY } from '../data/copy';
import type { ChatMessageAttachment as ChatMessageAttachmentValue } from '../types';
import { getChatAttachmentSrc } from '../utils/chat-attachments';

export interface ChatMessageAttachmentProps {
  readonly attachment: ChatMessageAttachmentValue;
}

/**
 * @description One image thumbnail on a sent message, served from the
 * attachments resource route and opened full size in a new tab. A failed load
 * (deleted, not yours, offline) swaps in a "missing image" placeholder.
 */
export const ChatMessageAttachment = (
  props: ChatMessageAttachmentProps,
): React.ReactElement => {
  const { attachment } = props;

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
    <a href={src} rel="noreferrer" target="_blank">
      <img
        alt={alt}
        className="max-h-40 max-w-48 rounded-md border object-cover"
        onError={onError}
        src={src}
      />
    </a>
  );
};
