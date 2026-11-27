import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_COMPOSER_ATTACHMENT_COPY } from '../data/copy';
import { useChatComposerImageInput } from '../hooks/useChatComposerImageInput';
import type { ChatComposerAttachmentProps } from '../types';
import { ChatComposerAttachmentChips } from './ChatComposerAttachmentChips';

export interface ChatComposerAttachmentZoneProps extends ChatComposerAttachmentProps {
  readonly children: React.ReactNode;
  /** Composer disabled or read-only: paste and drop are ignored. */
  readonly disabled: boolean;
}

/**
 * @description Wraps the composer input with image attachment support: shows
 * the chips, accepts pasted and dropped images (ignored while
 * `attachmentsDisabledReason` is set) and highlights while an image is dragged
 * over. Without `onAddFiles` and chips it renders its children untouched.
 */
export const ChatComposerAttachmentZone = (
  props: ChatComposerAttachmentZoneProps,
): React.ReactElement => {
  const {
    attachments = [],
    attachmentsDisabledReason,
    children,
    disabled,
    onAddFiles,
    onRemoveAttachment,
  } = props;

  // Hooks
  const imageInput = useChatComposerImageInput({
    disabled: disabled || attachmentsDisabledReason !== undefined,
    onAddFiles,
  });

  // Setup

  // Handlers
  const onRemove = (localId: string): void => {
    onRemoveAttachment?.(localId);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (onAddFiles === undefined && attachments.length === 0) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn('flex flex-col gap-2 rounded-md', {
        'ring-ring ring-2': imageInput.isDragging,
      })}
      data-testid="ChatComposerAttachmentZone"
      onDragLeave={imageInput.onDragLeave}
      onDragOver={imageInput.onDragOver}
      onDrop={imageInput.onDrop}
      onPaste={imageInput.onPaste}
    >
      <ChatComposerAttachmentChips
        attachments={attachments}
        onRemove={onRemove}
      />
      {children}
      {imageInput.isDragging && (
        <p className="text-muted-foreground text-xs" role="status">
          {CHAT_COMPOSER_ATTACHMENT_COPY.dropHint}
        </p>
      )}
    </div>
  );
};
