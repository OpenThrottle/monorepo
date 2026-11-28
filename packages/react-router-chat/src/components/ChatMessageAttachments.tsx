import * as React from 'react';

import type { ChatMessageAttachment as ChatMessageAttachmentValue } from '../types';
import { ChatImagePreviewDialog } from './ChatImagePreviewDialog';
import { ChatMessageAttachment } from './ChatMessageAttachment';

export interface ChatMessageAttachmentsProps {
  readonly attachments: readonly ChatMessageAttachmentValue[] | undefined;
}

/** @description The thumbnail row above a sent user message's text. */
export const ChatMessageAttachments = (
  props: ChatMessageAttachmentsProps,
): React.ReactElement | null => {
  const { attachments } = props;

  // Hooks
  const openerRef = React.useRef<HTMLElement | null>(null);
  const [openIndex, setOpenIndex] = React.useState<number | undefined>(
    undefined,
  );

  // Setup

  // Handlers
  const openPreview = (index: number, opener: HTMLElement): void => {
    openerRef.current = opener;
    setOpenIndex(index);
  };

  const closePreview = (): void => {
    setOpenIndex(undefined);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (attachments === undefined || attachments.length === 0) {
    return null;
  }

  return (
    <>
      <ul
        className="mb-2 flex flex-wrap justify-end gap-2"
        data-testid="ChatMessageAttachments"
      >
        {attachments.map((attachment, index) => (
          <li key={attachment.id}>
            <ChatMessageAttachment
              attachment={attachment}
              onOpen={(opener) => openPreview(index, opener)}
            />
          </li>
        ))}
      </ul>
      <ChatImagePreviewDialog
        attachments={attachments}
        index={openIndex}
        onClose={closePreview}
        onIndexChange={setOpenIndex}
        openerRef={openerRef}
      />
    </>
  );
};
