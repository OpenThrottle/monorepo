import * as React from 'react';

import type { ChatComposerAttachment } from '../types';
import { ChatComposerAttachmentChip } from './ChatComposerAttachmentChip';

export interface ChatComposerAttachmentChipsProps {
  readonly attachments: readonly ChatComposerAttachment[];
  readonly onRemove: (localId: string) => void;
}

/** @description The row of attachment chips above the composer textarea. */
export const ChatComposerAttachmentChips = (
  props: ChatComposerAttachmentChipsProps,
): React.ReactElement | null => {
  const { attachments, onRemove } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (attachments.length === 0) {
    return null;
  }

  return (
    <ul
      className="flex flex-wrap gap-2"
      data-testid="ChatComposerAttachmentChips"
    >
      {attachments.map((attachment) => (
        <ChatComposerAttachmentChip
          attachment={attachment}
          key={attachment.localId}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
};
