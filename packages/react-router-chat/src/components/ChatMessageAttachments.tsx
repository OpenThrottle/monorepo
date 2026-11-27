import * as React from 'react';

import type { ChatMessageAttachment as ChatMessageAttachmentValue } from '../types';
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

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (attachments === undefined || attachments.length === 0) {
    return null;
  }

  return (
    <ul
      className="mb-2 flex flex-wrap justify-end gap-2"
      data-testid="ChatMessageAttachments"
    >
      {attachments.map((attachment) => (
        <li key={attachment.id}>
          <ChatMessageAttachment attachment={attachment} />
        </li>
      ))}
    </ul>
  );
};
