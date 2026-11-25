import { toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type {
  AgentConversationGroup,
  AgentConversationListItem,
  ChatConversationEditTarget,
} from '../types';

export interface UseChatConversationSidebarOptions {
  /** Create a group from the new-group input; undefined when grouping is off. */
  readonly onCreateGroup:
    ((name: string, conversationId: string | null) => void) | undefined;
  /** Soft-delete a conversation (fired at once; the Undo toast follows). */
  readonly onDelete: (conversationId: string) => void;
  /** Commit an inline rename (only fired with a non-empty, trimmed title). */
  readonly onRename: (conversationId: string, title: string) => void;
  /** Commit a group rename; undefined when grouping is off. */
  readonly onRenameGroup: ((groupId: string, name: string) => void) | undefined;
  /** Undo a soft-delete: fired by the toast's Undo action. */
  readonly onRestore: (conversation: AgentConversationListItem) => void;
}

export interface UseChatConversationSidebarResult {
  /** Abandon the in-flight edit, discarding the draft. */
  readonly cancelEdit: () => void;
  /** Save the in-flight edit (Enter, or the input losing focus); an empty draft only cancels. */
  readonly commitEdit: () => void;
  /** Soft-delete at once and show a 5-second Undo toast. */
  readonly deleteConversation: (
    conversation: AgentConversationListItem,
  ) => void;
  /** Current draft text of the inline input. */
  readonly draft: string;
  /** What is being edited inline, or null. */
  readonly editing: ChatConversationEditTarget | null;
  /** Enter saves, Escape cancels. */
  readonly onEditKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  /** Replace the draft text. */
  readonly setDraft: (draft: string) => void;
  /** Begin renaming a group, seeding the draft from its name. */
  readonly startGroupRename: (group: AgentConversationGroup) => void;
  /** Begin naming a new group, optionally to receive a conversation. */
  readonly startNewGroup: (conversationId: string | null) => void;
  /** Begin renaming a conversation, seeding the draft from its title. */
  readonly startRename: (conversation: AgentConversationListItem) => void;
}

/**
 * @description Owns {@link ChatConversationSidebar}'s local interaction state —
 * one inline input at a time (a conversation title, a group name, or a new
 * group's name; Enter or blur saves, Escape cancels) and the immediate
 * soft-delete with its Undo toast — keeping the component presentational. The
 * consumer still owns the data and every effect.
 *
 * @public
 */
export const useChatConversationSidebar = (
  options: UseChatConversationSidebarOptions,
): UseChatConversationSidebarResult => {
  const { onCreateGroup, onDelete, onRename, onRenameGroup, onRestore } =
    options;

  // Hooks
  const [editing, setEditing] =
    React.useState<ChatConversationEditTarget | null>(null);
  const [draft, setDraft] = React.useState('');
  // Enter saves and unmounts the input, which can still fire its blur: read the
  // live target so that second save is a no-op.
  const editingRef = React.useRef<ChatConversationEditTarget | null>(null);
  const draftRef = React.useRef('');

  // Setup
  /** How long the delete Undo toast stays up. */
  const DELETE_UNDO_TOAST_MS = 5000;

  // Handlers
  const beginEdit = (
    target: ChatConversationEditTarget,
    seed: string,
  ): void => {
    editingRef.current = target;
    draftRef.current = seed;
    setEditing(target);
    setDraft(seed);
  };

  const updateDraft = (next: string): void => {
    draftRef.current = next;
    setDraft(next);
  };

  const startRename = (conversation: AgentConversationListItem): void => {
    beginEdit(
      { id: conversation.id, kind: 'conversation' },
      conversation.title ?? '',
    );
  };

  const startGroupRename = (group: AgentConversationGroup): void => {
    beginEdit({ id: group.id, kind: 'group' }, group.name);
  };

  const startNewGroup = (conversationId: string | null): void => {
    beginEdit({ conversationId, kind: 'new-group' }, '');
  };

  const cancelEdit = (): void => {
    editingRef.current = null;
    draftRef.current = '';
    setEditing(null);
    setDraft('');
  };

  const commitEdit = (): void => {
    const target = editingRef.current;
    const next = draftRef.current.trim();
    cancelEdit();
    if (target == null || next.length === 0) {
      return;
    }

    if (target.kind === 'conversation') {
      onRename(target.id, next);
    } else if (target.kind === 'group') {
      onRenameGroup?.(target.id, next);
    } else {
      onCreateGroup?.(next, target.conversationId);
    }
  };

  const onEditKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
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
    cancelEdit,
    commitEdit,
    deleteConversation,
    draft,
    editing,
    onEditKeyDown,
    setDraft: updateDraft,
    startGroupRename,
    startNewGroup,
    startRename,
  };
};
