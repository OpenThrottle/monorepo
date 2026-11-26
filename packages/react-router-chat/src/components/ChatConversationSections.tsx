import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import type { UseChatConversationSidebarResult } from '../hooks/useChatConversationSidebar';
import type {
  AgentConversationListItem,
  ChatConversationGrouping,
} from '../types';
import {
  conversationDragId,
  dateSectionId,
  groupSectionId,
} from '../utils/conversation-drag';
import type { ConversationSection } from '../utils/conversation-sections';
import { moveGroupInOrder } from '../utils/conversation-sections';
import { ChatConversationDragItem } from './ChatConversationDragItem';
import { ChatConversationDropSection } from './ChatConversationDropSection';
import { ChatConversationEditInput } from './ChatConversationEditInput';
import { ChatConversationGroupHeader } from './ChatConversationGroupHeader';
import { ChatConversationRow } from './ChatConversationRow';
import { ChatConversationUngroupDropZone } from './ChatConversationUngroupDropZone';

export interface ChatConversationSectionsProps {
  readonly activeConversationId: string | null;
  /** Pinning and groups; undefined renders date sections only. */
  readonly grouping: ChatConversationGrouping | undefined;
  readonly onSelect: (conversationId: string) => void;
  readonly sections: readonly ConversationSection[];
  /** The sidebar's inline-edit and delete state. */
  readonly sidebar: UseChatConversationSidebarResult;
}

/**
 * @description The body of {@link ChatConversationSidebar}: Pinned, the user's
 * groups (collapsible, with a new-group input after them while one is being
 * named), then Today, Previous 7 days and Older.
 */
export const ChatConversationSections = (
  props: ChatConversationSectionsProps,
): React.ReactElement => {
  const { activeConversationId, grouping, onSelect, sections, sidebar } = props;
  const { draft, editing } = sidebar;

  // Hooks

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const groups = grouping?.groups ?? null;
  const collapsed = new Set(grouping?.collapsedGroupIds ?? []);
  const dateLabels = {
    older: copy.sectionOlder,
    pinned: copy.sectionPinned,
    'previous-week': copy.sectionPreviousWeek,
    today: copy.sectionToday,
  };
  const isDndEnabled = grouping != null;
  const isEditingConversation = (id: string): boolean => {
    return editing?.kind === 'conversation' && editing.id === id;
  };
  const groupMover = (groupId: string, offset: number): (() => void) | null => {
    const order = moveGroupInOrder(groups ?? [], groupId, offset);

    return order == null ? null : () => grouping?.onReorderGroups(order);
  };

  // Handlers

  // Markup
  const renderRows = (
    conversations: readonly AgentConversationListItem[],
    indented: boolean,
  ): React.ReactNode => {
    return conversations.map((conversation) => (
      <ChatConversationDragItem
        dragId={conversationDragId(conversation.id)}
        enabled={isDndEnabled && !isEditingConversation(conversation.id)}
        key={conversation.id}
      >
        <ChatConversationRow
          conversation={conversation}
          draftTitle={draft}
          groups={groups}
          indented={indented}
          isActive={conversation.id === activeConversationId}
          isEditing={isEditingConversation(conversation.id)}
          onCommitRename={sidebar.commitEdit}
          onDraftTitleChange={sidebar.setDraft}
          onMoveToGroup={(groupId) =>
            grouping?.onMoveToGroup(conversation.id, groupId)
          }
          onNewGroup={() => sidebar.startNewGroup(conversation.id)}
          onRenameKeyDown={sidebar.onEditKeyDown}
          onRequestDelete={() => sidebar.deleteConversation(conversation)}
          onSelect={() => onSelect(conversation.id)}
          onStartRename={() => sidebar.startRename(conversation)}
          onTogglePin={() =>
            grouping?.onSetPinned(conversation.id, !conversation.pinned)
          }
        />
      </ChatConversationDragItem>
    ));
  };

  const editInput = (testId: string, ariaLabel: string): React.ReactElement => {
    return (
      <div className="px-2 py-0.5">
        <ChatConversationEditInput
          ariaLabel={ariaLabel}
          onChange={sidebar.setDraft}
          onCommit={sidebar.commitEdit}
          onKeyDown={sidebar.onEditKeyDown}
          testId={testId}
          value={draft}
        />
      </div>
    );
  };

  const renderSection = (section: ConversationSection): React.ReactElement => {
    if (section.kind === 'date') {
      return (
        <ChatConversationDropSection
          ariaLabel={dateLabels[section.key]}
          dropId={dateSectionId(section.key)}
          enabled={isDndEnabled}
          key={section.key}
        >
          <h3 className="text-muted-foreground px-3 pt-3 pb-1 text-xs font-medium tracking-wide uppercase">
            {dateLabels[section.key]}
          </h3>
          {renderRows(section.conversations, false)}
        </ChatConversationDropSection>
      );
    }

    const { group } = section;
    const isCollapsed = collapsed.has(group.id);
    const isRenaming = editing?.kind === 'group' && editing.id === group.id;
    const isEmpty = section.conversations.length === 0;
    const renameInput = editInput(
      `ChatConversationSidebar-group-rename-input-${group.id}`,
      copy.groupNamePlaceholder,
    );
    const groupHeader = (
      <ChatConversationGroupHeader
        count={section.conversations.length}
        group={group}
        isCollapsed={isCollapsed}
        onDelete={() => grouping?.onDeleteGroup(group.id)}
        onMoveDown={groupMover(group.id, 1)}
        onMoveUp={groupMover(group.id, -1)}
        onStartRename={() => sidebar.startGroupRename(group)}
        onToggleCollapsed={() => grouping?.onToggleGroupCollapsed(group.id)}
      />
    );
    const header = isRenaming ? renameInput : groupHeader;
    const emptyHint = (
      <p className="text-muted-foreground px-3 py-1 pl-6 text-xs">
        {copy.groupEmpty}
      </p>
    );
    const body = isEmpty ? emptyHint : renderRows(section.conversations, true);

    return (
      <ChatConversationDropSection
        ariaLabel={group.name}
        dropId={groupSectionId(group.id)}
        enabled={isDndEnabled}
        key={group.id}
      >
        {header}
        {isCollapsed ? null : body}
      </ChatConversationDropSection>
    );
  };

  const isNamingNewGroup = editing?.kind === 'new-group';
  const newGroupField = editInput(
    'ChatConversationSidebar-new-group-input',
    copy.groupNamePlaceholder,
  );
  const newGroupInput = isNamingNewGroup ? newGroupField : null;
  const pinnedSections = sections.filter(
    (section) => section.kind === 'date' && section.key === 'pinned',
  );
  const groupSections = sections.filter((section) => section.kind === 'group');
  const dateSections = sections.filter(
    (section) => section.kind === 'date' && section.key !== 'pinned',
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col pb-1">
      {pinnedSections.map(renderSection)}
      {groupSections.map(renderSection)}
      {newGroupInput}
      {dateSections.map(renderSection)}
      <ChatConversationUngroupDropZone
        enabled={isDndEnabled && dateSections.length === 0}
      />
    </div>
  );
};
