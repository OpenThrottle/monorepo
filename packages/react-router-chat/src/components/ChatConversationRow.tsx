import * as React from 'react';
import { Button, Input } from '@openthrottle/react-router-shadcn';
import { Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { formatRelativeChatTimestamp } from '../utils/index';
import type { AgentConversationListItem } from '../types';

export interface ChatConversationRowProps {
  readonly conversation: AgentConversationListItem;
  /** Current rename draft; only read while {@link isEditing}. */
  readonly draftTitle: string;
  readonly isActive: boolean;
  readonly isEditing: boolean;
  readonly onCancelRename: () => void;
  readonly onDraftTitleChange: (value: string) => void;
  readonly onRenameKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  readonly onRequestDelete: () => void;
  readonly onSelect: () => void;
  readonly onStartRename: () => void;
}

/**
 * @description A single {@link ChatConversationSidebar} row: a selectable
 * title + relative timestamp with an active highlight, plus rename and delete
 * controls. Swaps to an inline rename {@link Input} while editing. Purely
 * presentational — every action is delegated to the sidebar's handlers.
 *
 * @public
 */
export const ChatConversationRow = (
  props: ChatConversationRowProps,
): React.ReactElement => {
  const {
    conversation,
    draftTitle,
    isActive,
    isEditing,
    onCancelRename,
    onDraftTitleChange,
    onRenameKeyDown,
    onRequestDelete,
    onSelect,
    onStartRename,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const label =
    conversation.title != null && conversation.title.trim() !== ''
      ? conversation.title
      : copy.untitled;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEditing) {
    return (
      <div className="px-2 py-0.5">
        <Input
          aria-label={copy.renamePlaceholder}
          autoFocus={true}
          className="h-9"
          data-testid={`ChatConversationSidebar-rename-input-${conversation.id}`}
          onBlur={onCancelRename}
          onChange={(event) => onDraftTitleChange(event.target.value)}
          onKeyDown={onRenameKeyDown}
          placeholder={copy.renamePlaceholder}
          value={draftTitle}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        // 'group/row flex items-center gap-1 rounded-md ',
        'group/row hover:bg-accent/50 flex max-w-full px-2 py-2',
        isActive && 'bg-accent',
      )}
    >
      <div className="flex-1">
        <button
          aria-current={isActive ? 'true' : undefined}
          className="flex cursor-pointer flex-col text-left"
          // className="hover:bg-accent/50 flex min-w-0 flex-1 flex-col items-start rounded-md px-1 py-1 text-left"
          data-testid={`ChatConversationSidebar-select-${conversation.id}`}
          onClick={onSelect}
          type="button"
        >
          <div className="line-clamp-1 text-sm">{label}</div>
          <div className="text-xs">
            {formatRelativeChatTimestamp(conversation.updatedAt)}
          </div>
        </button>
      </div>
      <div>
        <Button
          aria-label={`Rename ${label}`}
          // className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          data-testid={`ChatConversationSidebar-rename-${conversation.id}`}
          onClick={onStartRename}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          aria-label={`Delete ${label}`}
          // className="text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          data-testid={`ChatConversationSidebar-delete-${conversation.id}`}
          onClick={onRequestDelete}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
