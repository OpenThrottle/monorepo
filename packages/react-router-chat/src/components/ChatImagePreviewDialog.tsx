import { fillTemplate } from '@openthrottle/nodejs-utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import * as React from 'react';

import {
  CHAT_IMAGE_PREVIEW_COPY,
  CHAT_MESSAGE_ATTACHMENT_COPY,
} from '../data/copy';
import type { ChatMessageAttachment } from '../types';
import { getChatAttachmentSrc } from '../utils/chat-attachments';

export interface ChatImagePreviewDialogProps {
  /** Every image on the message; the arrows step through it. */
  readonly attachments: readonly ChatMessageAttachment[];
  /** Index of the open image; undefined keeps the dialog closed. */
  readonly index: number | undefined;
  readonly onClose: () => void;
  /** Reports the index the arrows moved to. */
  readonly onIndexChange: (index: number) => void;
  /** The thumbnail that opened the preview; focus returns to it on close. */
  readonly openerRef: React.RefObject<HTMLElement | null>;
}

/**
 * @description Full-size preview of one sent-message image in a shadcn Dialog
 * (not the URL-synced GlobalModal, so opening it never re-runs loaders). Esc,
 * the close button and a backdrop click close it; Left/Right (or the buttons)
 * step through the message's images, wrapping at either end. A Radix dialog
 * portals out and stacks its dismissal layer, so inside the header ChatDialog
 * Esc closes only this preview.
 */
export const ChatImagePreviewDialog = (
  props: ChatImagePreviewDialogProps,
): React.ReactElement => {
  const { attachments, index, onClose, onIndexChange, openerRef } = props;

  // Hooks

  // Setup
  const copy = CHAT_IMAGE_PREVIEW_COPY;
  const current = index === undefined ? undefined : attachments[index];
  const canStep = attachments.length > 1;
  const src = current === undefined ? '' : getChatAttachmentSrc(current.id);
  const name = current?.originalName ?? CHAT_MESSAGE_ATTACHMENT_COPY.altFallback; // prettier-ignore
  const position = fillTemplate(copy.position, {
    index: `${(index ?? 0) + 1}`,
    total: `${attachments.length}`,
  });

  // Handlers
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };

  // Radix only restores focus to a Dialog.Trigger, and this dialog is
  // controlled by its parent, so hand focus back to the thumbnail ourselves.
  const handleCloseAutoFocus = (event: Event): void => {
    event.preventDefault();
    openerRef.current?.focus();
  };

  const step = (delta: number): void => {
    if (index === undefined || !canStep) {
      return;
    }
    onIndexChange((index + delta + attachments.length) % attachments.length);
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    const hasModifier =
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (hasModifier) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  };

  // Markup
  const navigation = canStep && (
    <div className="flex items-center gap-1">
      <Button
        aria-label={copy.previousImage}
        onClick={() => step(-1)}
        size="icon"
        title={copy.previousImage}
        type="button"
        variant="ghost"
      >
        <ChevronLeft aria-hidden={true} className="size-4" />
      </Button>
      <span className="text-muted-foreground text-xs tabular-nums">
        {position}
      </span>
      <Button
        aria-label={copy.nextImage}
        onClick={() => step(1)}
        size="icon"
        title={copy.nextImage}
        type="button"
        variant="ghost"
      >
        <ChevronRight aria-hidden={true} className="size-4" />
      </Button>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={current !== undefined}>
      <DialogContent
        aria-describedby={undefined}
        className="flex w-auto max-w-[95vw] flex-col items-center gap-3 p-4 sm:max-w-[95vw]"
        data-testid="ChatImagePreviewDialog"
        onCloseAutoFocus={handleCloseAutoFocus}
        onKeyDown={handleKeyDown}
      >
        <DialogTitle className="max-w-[80vw] truncate pr-8 text-sm">
          {name}
        </DialogTitle>
        <img
          alt={name}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          src={src}
        />
        <div className="flex w-full items-center justify-between gap-2">
          <Button asChild={true} size="sm" variant="outline">
            <a href={src} rel="noreferrer" target="_blank">
              <ExternalLink aria-hidden={true} className="size-4" />
              {copy.openOriginal}
            </a>
          </Button>
          {navigation}
        </div>
      </DialogContent>
    </Dialog>
  );
};
