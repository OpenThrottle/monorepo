import * as React from 'react';
import type { AgentConversationListItem } from '../types';

export interface UseChatConversationSidebarOptions {
  /** Soft-delete a conversation once its confirm dialog is accepted. */
  readonly onDelete: (conversationId: string) => void;
  /** Commit an inline rename (only fired with a non-empty, trimmed title). */
  readonly onRename: (conversationId: string, title: string) => void;
}

export interface UseChatConversationSidebarResult {
  /** Abandon the in-flight rename, discarding the draft. */
  readonly cancelRename: () => void;
  /** Accept the pending soft-delete (no-op when nothing is pending). */
  readonly confirmDelete: () => void;
  /** Current rename draft text. */
  readonly draftTitle: string;
  /** Conversation being renamed inline, or null. */
  readonly editingId: string | null;
  /** Enter commits the rename, Escape cancels it. */
  readonly onRenameKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
    conversationId: string,
  ) => void;
  /** Conversation queued for deletion (drives the confirm dialog), or null. */
  readonly pendingDeleteId: string | null;
  /** Queue a conversation for confirm-guarded deletion. */
  readonly requestDelete: (conversationId: string) => void;
  /** Dismiss the delete confirm dialog without deleting. */
  readonly resetPendingDelete: () => void;
  /** Replace the rename draft text. */
  readonly setDraftTitle: (title: string) => void;
  /** Begin renaming a conversation, seeding the draft from its title. */
  readonly startRename: (conversation: AgentConversationListItem) => void;
}

/**
 * @description Owns {@link ChatConversationSidebar}'s local interaction state —
 * the inline-rename draft (Enter commits, Escape cancels) and the
 * confirm-guarded soft-delete — keeping the component itself presentational. The
 * consumer still owns the data and the `onRename` / `onDelete` effects.
 *
 * @public
 */
export const useChatConversationSidebar = (
  options: UseChatConversationSidebarOptions,
): UseChatConversationSidebarResult => {
  const { onDelete, onRename } = options;

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  );

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

  const confirmDelete = (): void => {
    if (pendingDeleteId != null) {
      onDelete(pendingDeleteId);
    }
    setPendingDeleteId(null);
  };

  return {
    cancelRename,
    confirmDelete,
    draftTitle,
    editingId,
    onRenameKeyDown,
    pendingDeleteId,
    requestDelete: setPendingDeleteId,
    resetPendingDelete: () => setPendingDeleteId(null),
    setDraftTitle,
    startRename,
  };
};
