import { Button, Input } from '@openthrottle/react-router-shadcn';
import clsx from 'clsx';
import { Pencil, Trash2 } from 'lucide-react';
import * as React from 'react';

import {
  ACTION_TOUCH_CLASSES,
  ACTION_VISIBILITY_CLASSES,
} from '../data/chat-conversation-row.classes';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type { AgentConversationListItem } from '../types';
import { formatRelativeChatTimestamp } from '../utils/index';

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
        'group/row hover:bg-accent/50 flex max-w-full items-center gap-1 px-2 py-2 pointer-coarse:py-0.5',
        isActive && 'bg-accent',
      )}
    >
      {/* w-0: ScrollArea's display:table viewport would otherwise grow to the untruncated title. */}
      <div className="w-0 min-w-0 flex-1">
        <button
          aria-current={isActive ? 'true' : undefined}
          className="flex w-full min-w-0 cursor-pointer flex-col text-left pointer-coarse:py-1.5"
          data-testid={`ChatConversationSidebar-select-${conversation.id}`}
          onClick={onSelect}
          type="button"
        >
          <div className="w-full truncate text-sm">{label}</div>
          <div className="text-muted-foreground w-full truncate text-xs">
            {formatRelativeChatTimestamp(conversation.updatedAt)}
          </div>
        </button>
      </div>

      <div className="flex shrink-0 items-center">
        <Button
          aria-label={`Rename ${label}`}
          className={clsx(ACTION_VISIBILITY_CLASSES, ACTION_TOUCH_CLASSES)}
          data-testid={`ChatConversationSidebar-rename-${conversation.id}`}
          onClick={onStartRename}
          size="xs"
          type="button"
          variant="ghost"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          aria-label={`Delete ${label}`}
          className={clsx(
            'text-muted-foreground hover:text-destructive',
            ACTION_VISIBILITY_CLASSES,
            ACTION_TOUCH_CLASSES,
          )}
          data-testid={`ChatConversationSidebar-delete-${conversation.id}`}
          onClick={onRequestDelete}
          size="xs"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
