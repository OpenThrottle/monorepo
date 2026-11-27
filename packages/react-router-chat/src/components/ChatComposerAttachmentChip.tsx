import { Button, cn, Spinner } from '@openthrottle/react-router-shadcn';
import { X } from 'lucide-react';
import * as React from 'react';

import { CHAT_COMPOSER_ATTACHMENT_COPY } from '../data/copy';
import type { ChatComposerAttachment } from '../types';

export interface ChatComposerAttachmentChipProps {
  readonly attachment: ChatComposerAttachment;
  readonly onRemove: (localId: string) => void;
}

/**
 * @description One image chip in the composer: thumbnail, name, an uploading
 * spinner or the upload error, and a remove button. Error chips stay removable.
 */
export const ChatComposerAttachmentChip = (
  props: ChatComposerAttachmentChipProps,
): React.ReactElement => {
  const { attachment, onRemove } = props;

  // Hooks

  // Setup
  const isError = attachment.status === 'error';
  const label = attachment.status === 'error' ? attachment.error : attachment.name; // prettier-ignore
  const removeLabel = `${CHAT_COMPOSER_ATTACHMENT_COPY.removePrefix} ${attachment.name}`;

  // Handlers
  const onRemoveClick = (): void => {
    onRemove(attachment.localId);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={cn(
        'bg-muted text-muted-foreground flex items-center gap-2 rounded-md border p-1 pr-0.5 text-xs',
        { 'border-destructive': isError },
      )}
      data-status={attachment.status}
      data-testid="ChatComposerAttachmentChip"
    >
      <span className="relative size-8 shrink-0 overflow-hidden rounded">
        <img
          alt={attachment.name}
          className={cn('size-full object-cover', {
            'opacity-50': attachment.status !== 'ready',
          })}
          src={attachment.previewUrl}
        />
        {attachment.status === 'uploading' && (
          <Spinner
            aria-label={CHAT_COMPOSER_ATTACHMENT_COPY.uploading}
            className="absolute inset-0 m-auto"
          />
        )}
      </span>
      <span
        className={cn('max-w-40 truncate', { 'text-destructive': isError })}
        role={isError ? 'alert' : undefined}
        title={label}
      >
        {label}
      </span>
      <Button
        aria-label={removeLabel}
        onClick={onRemoveClick}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </li>
  );
};
