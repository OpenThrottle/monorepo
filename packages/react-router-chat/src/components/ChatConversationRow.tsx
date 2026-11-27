import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import {
  CHAT_PANEL_HOVER_CLASSES,
  CHAT_PANEL_SELECTED_CLASSES,
} from '../data/chat-panel.classes';
import type {
  AgentConversationGroup,
  AgentConversationListItem,
} from '../types';
import { formatRelativeChatTimestamp } from '../utils/index';
import { ChatConversationEditInput } from './ChatConversationEditInput';
import { ChatConversationRowMenu } from './ChatConversationRowMenu';

export interface ChatConversationRowProps {
  readonly conversation: AgentConversationListItem;
  /** Current rename draft; only read while {@link isEditing}. */
  readonly draftTitle: string;
  /** The user's groups; null when the host offers no pinning or groups. */
  readonly groups: readonly AgentConversationGroup[] | null;
  /** Indents the row under a group header. */
  readonly indented: boolean;
  readonly isActive: boolean;
  readonly isEditing: boolean;
  readonly onCommitRename: () => void;
  readonly onDraftTitleChange: (value: string) => void;
  readonly onMoveToGroup: (groupId: string | null) => void;
  readonly onNewGroup: () => void;
  readonly onRenameKeyDown: (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => void;
  readonly onRequestDelete: () => void;
  readonly onSelect: () => void;
  readonly onStartRename: () => void;
  readonly onTogglePin: () => void;
}

/**
 * @description A single {@link ChatConversationSidebar} row: a selectable
 * title + relative timestamp with an active highlight. Double-click the title
 * (or press F2 on it) to rename inline; everything else is in the `⋯` menu.
 * Purely presentational — every action is delegated to the sidebar.
 *
 * @public
 */
export const ChatConversationRow = (
  props: ChatConversationRowProps,
): React.ReactElement => {
  const {
    conversation,
    draftTitle,
    groups,
    indented,
    isActive,
    isEditing,
    onCommitRename,
    onDraftTitleChange,
    onMoveToGroup,
    onNewGroup,
    onRenameKeyDown,
    onRequestDelete,
    onSelect,
    onStartRename,
    onTogglePin,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const title = conversation.title ?? '';
  const label = title.trim() !== '' ? title : copy.untitled;

  // Handlers
  const handleTitleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ): void => {
    if (event.key === 'F2') {
      event.preventDefault();
      onStartRename();
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (isEditing) {
    return (
      <div className={cn('px-2 py-0.5', indented && 'pl-6')}>
        <ChatConversationEditInput
          ariaLabel={copy.renamePlaceholder}
          onChange={onDraftTitleChange}
          onCommit={onCommitRename}
          onKeyDown={onRenameKeyDown}
          testId={`ChatConversationSidebar-rename-input-${conversation.id}`}
          value={draftTitle}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group/row mx-1 flex max-w-full items-center gap-1 rounded-md py-1 pr-1 pl-2 pointer-coarse:py-0.5',
        CHAT_PANEL_HOVER_CLASSES,
        indented && 'pl-6',
        isActive && CHAT_PANEL_SELECTED_CLASSES,
      )}
    >
      {/* w-0: ScrollArea's display:table viewport would otherwise grow to the untruncated title. */}
      <div className="w-0 min-w-0 flex-1">
        <button
          aria-current={isActive ? 'page' : undefined}
          className="flex w-full min-w-0 cursor-pointer flex-col text-left pointer-coarse:py-1.5"
          data-testid={`ChatConversationSidebar-select-${conversation.id}`}
          onClick={onSelect}
          onDoubleClick={onStartRename}
          onKeyDown={handleTitleKeyDown}
          title={copy.renameHint}
          type="button"
        >
          <span className="w-full truncate text-sm">{label}</span>
          <span className="text-muted-foreground w-full truncate text-xs">
            {formatRelativeChatTimestamp(conversation.updatedAt)}
          </span>
        </button>
      </div>

      <ChatConversationRowMenu
        alwaysVisible={isActive}
        conversation={conversation}
        groups={groups}
        label={label}
        onDelete={onRequestDelete}
        onMoveToGroup={onMoveToGroup}
        onNewGroup={onNewGroup}
        onOpen={onSelect}
        onRename={onStartRename}
        onTogglePin={onTogglePin}
      />
    </div>
  );
};
