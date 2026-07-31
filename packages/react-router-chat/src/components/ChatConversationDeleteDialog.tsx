import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@openthrottle/react-router-shadcn';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';

export interface ChatConversationDeleteDialogProps {
  /** Accept the deletion. */
  readonly onConfirm: () => void;
  /** Fired when the dialog requests to close without deleting. */
  readonly onDismiss: () => void;
  /** Open while a conversation is queued for deletion. */
  readonly open: boolean;
}

/**
 * @description Confirm-guard for {@link ChatConversationSidebar}'s soft-delete:
 * a modal `AlertDialog` explaining that the conversation is only removed from the
 * list (its messages are retained and restorable). Cancelling or dismissing
 * leaves the list untouched.
 *
 * @public
 */
export const ChatConversationDeleteDialog = (
  props: ChatConversationDeleteDialogProps,
): React.ReactElement => {
  const { onConfirm, onDismiss, open } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog
      onOpenChange={(next) => {
        if (!next) {
          onDismiss();
        }
      }}
      open={open}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.deleteConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.deleteConfirmDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.deleteConfirmCancel}</AlertDialogCancel>
          <AlertDialogAction
            data-testid="ChatConversationSidebar-confirm-delete"
            onClick={onConfirm}
          >
            {copy.deleteConfirmAction}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
