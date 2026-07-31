import * as React from 'react';
import { toast } from '@openthrottle/react-router-shadcn';
import type { MailMessageDetail } from '~/types/mail';

/** Pending confirmation for the reading-pane Archive / Delete actions. */
export type ConfirmAction = 'archive' | 'delete' | null;

/** Options for {@link useMessageDetail}. */
export interface UseMessageDetailOptions {
  readonly message?: MailMessageDetail | null;
  readonly onArchive?: (message: MailMessageDetail) => void;
  readonly onDelete?: (message: MailMessageDetail) => void;
}

/** Return value of {@link useMessageDetail}. */
export interface UseMessageDetailResult {
  readonly confirmAction: ConfirmAction;
  readonly handleArchiveClick: () => void;
  readonly handleCancelConfirm: () => void;
  readonly handleConfirmArchive: () => void;
  readonly handleConfirmDelete: () => void;
  readonly handleDeleteClick: () => void;
}

/**
 * @description Owns the {@link MessageDetail} action behavior: which confirm
 * modal (archive/delete) is open, and the click/confirm/cancel handlers that
 * drive it (with success toasts). Reply/Forward stay as Links to compose.
 */
export const useMessageDetail = (
  options: UseMessageDetailOptions,
): UseMessageDetailResult => {
  const { message, onArchive, onDelete } = options;

  // Hooks
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction>(null);

  // Setup

  // Handlers
  const handleArchiveClick = React.useCallback(() => {
    if (message != null) setConfirmAction('archive');
  }, [message]);

  const handleDeleteClick = React.useCallback(() => {
    if (message != null) setConfirmAction('delete');
  }, [message]);

  const handleConfirmArchive = React.useCallback(() => {
    if (message != null) {
      onArchive?.(message);
      setConfirmAction(null);
      toast.success('Message archived');
    }
  }, [message, onArchive]);

  const handleConfirmDelete = React.useCallback(() => {
    if (message != null) {
      onDelete?.(message);
      setConfirmAction(null);
      toast.success('Message moved to trash');
    }
  }, [message, onDelete]);

  const handleCancelConfirm = React.useCallback(() => {
    setConfirmAction(null);
  }, []);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    confirmAction,
    handleArchiveClick,
    handleCancelConfirm,
    handleConfirmArchive,
    handleConfirmDelete,
    handleDeleteClick,
  };
};
