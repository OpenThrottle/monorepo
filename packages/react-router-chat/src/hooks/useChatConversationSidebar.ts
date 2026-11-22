import { toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/data.chat-conversation-sidebar.copy';
import type { AgentConversationListItem } from '../types';

export interface UseChatConversationSidebarOptions {
  /** Soft-delete a conversation (fired at once; the Undo toast follows). */
  readonly onDelete: (conversationId: string) => void;
  /** Commit an inline rename (only fired with a non-empty, trimmed title). */
  readonly onRename: (conversationId: string, title: string) => void;
  /** Undo a soft-delete: fired by the toast's Undo action. */
  readonly onRestore: (conversation: AgentConversationListItem) => void;
}

export interface UseChatConversationSidebarResult {
  /** Abandon the in-flight rename, discarding the draft. */
  readonly cancelRename: () => void;
  /** Soft-delete at once and show a 5-second Undo toast. */
  readonly deleteConversation: (
    conversation: AgentConversationListItem,
  ) => void;
  /** Current rename draft text. */
  readonly draftTitle: string;
  /** Conversation being renamed inline, or null. */
  readonly editingId: string | null;
  /** Enter commits the rename, Escape cancels it. */
  readonly onRenameKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    conversationId: string,
  ) => void;
  /** Replace the rename draft text. */
  readonly setDraftTitle: (title: string) => void;
  /** Begin renaming a conversation, seeding the draft from its title. */
  readonly startRename: (conversation: AgentConversationListItem) => void;
}

/**
 * @description Owns {@link ChatConversationSidebar}'s local interaction state —
 * the inline-rename draft (Enter commits, Escape cancels) and the
 * immediate soft-delete with its Undo toast — keeping the component itself presentational. The
 * consumer still owns the data and the `onRename` / `onDelete` / `onRestore` effects.
 *
 * @public
 */
export const useChatConversationSidebar = (
  options: UseChatConversationSidebarOptions,
): UseChatConversationSidebarResult => {
  const { onDelete, onRename, onRestore } = options;

  // Hooks
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');

  // Setup
  /** How long the delete Undo toast stays up. */
  const DELETE_UNDO_TOAST_MS = 5000;

  // Handlers
  const startRename = (conversation: AgentConversationListItem): void => {
    setEditingId(conversation.id);
    setDraftTitle(conversation.title ?? '');
  };

  const cancelRename = (): void => {
    setEditingId(null);
    setDraftTitle('');
  };

  const commitRename = (conversationId: string): void => {
    const next = draftTitle.trim();
    if (next.length > 0) {
      onRename(conversationId, next);
    }
    cancelRename();
  };

  const onRenameKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
    conversationId: string,
  ): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename(conversationId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelRename();
    }
  };

  const deleteConversation = (
    conversation: AgentConversationListItem,
  ): void => {
    onDelete(conversation.id);
    toast(CHAT_CONVERSATION_SIDEBAR_COPY.deletedToast, {
      action: {
        label: CHAT_CONVERSATION_SIDEBAR_COPY.deleteUndo,
        onClick: () => onRestore(conversation),
      },
      duration: DELETE_UNDO_TOAST_MS,
    });
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return {
    cancelRename,
    deleteConversation,
    draftTitle,
    editingId,
    onRenameKeyDown,
    setDraftTitle,
    startRename,
  };
};
