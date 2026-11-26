import {
  Button,
  cn,
  Empty,
  ScrollArea,
  Skeleton,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { useChatConversationSidebar } from '../hooks/useChatConversationSidebar';
import type {
  AgentConversationListItem,
  ChatConversationGrouping,
} from '../types';
import { buildConversationSections } from '../utils/conversation-sections';
import { ChatConversationDndContext } from './ChatConversationDndContext';
import { ChatConversationListError } from './ChatConversationListError';
import { ChatConversationSections } from './ChatConversationSections';
import { ChatConversationSidebarHeader } from './ChatConversationSidebarHeader';

export interface ChatConversationSidebarProps {
  /** Currently-open conversation, highlighted in the list; null/undefined for a fresh thread. */
  readonly activeConversationId?: string | null;
  readonly className?: string;
  /** The conversations to list (already paginated by the consumer). */
  readonly conversations: readonly AgentConversationListItem[];
  /** Why the list failed to load; replaces the empty state when no rows loaded. */
  readonly errorMessage?: string | null;
  /**
   * Pinning and user-defined groups. Omit it (the admin app) for date sections
   * only, with no Pin or Move to group menu items.
   */
  readonly grouping?: ChatConversationGrouping;
  /** Extra header controls after New chat (the docked column's collapse button). */
  readonly headerEnd?: React.ReactNode;
  /** Suppress the built-in header row when a wrapper (e.g. {@link ChatConversationSheet}) supplies its own. */
  readonly hideHeader?: boolean;
  /** True while the first page loads — renders skeleton rows instead of the list. */
  readonly isLoading?: boolean;
  /** True while a load-more request is in flight — disables the button. */
  readonly isLoadingMore?: boolean;
  /** Soft-delete a conversation at once; an Undo toast follows (see {@link onRestore}). */
  readonly onDelete: (conversationId: string) => void;
  /** Fetch the next page; omit to hide the load-more affordance. */
  readonly onLoadMore?: () => void;
  /** Start a fresh conversation (clears the active thread). */
  readonly onNewChat: () => void;
  /** Commit an inline rename (only fired with a non-empty, trimmed title). */
  readonly onRename: (conversationId: string, title: string) => void;
  /** Undo a delete (the toast's Undo action): re-list and restore the conversation. */
  readonly onRestore: (conversation: AgentConversationListItem) => void;
  /** Re-request the list; shown as a Retry action in the error state. */
  readonly onRetry?: () => void;
  /** Open a conversation (restore its thread). */
  readonly onSelect: (conversationId: string) => void;
  /**
   * Total server-side conversation count. When greater than the number of loaded
   * rows (and {@link onLoadMore} is supplied), the load-more affordance shows.
   */
  readonly totalCount?: number;
}

/**
 * @description Fully-controlled, presentational conversations list for the
 * docked column, the conversation sheet and the header switcher: Pinned, the
 * user's groups and date sections ({@link ChatConversationSections}), New chat,
 * and an optional Load more. The package owns no data or fetching — the
 * consumer supplies the rows, the optional {@link ChatConversationGrouping},
 * and every handler.
 *
 * @public
 */
export const ChatConversationSidebar = (
  props: ChatConversationSidebarProps,
): React.ReactElement => {
  const {
    activeConversationId,
    className,
    conversations,
    errorMessage,
    grouping,
    headerEnd = null,
    hideHeader = false,
    isLoading = false,
    isLoadingMore = false,
    onDelete,
    onLoadMore,
    onNewChat,
    onRename,
    onRestore,
    onRetry,
    onSelect,
    totalCount,
  } = props;

  // Hooks
  const sidebar = useChatConversationSidebar({
    onCreateGroup: grouping?.onCreateGroup,
    onDelete,
    onRename,
    onRenameGroup: grouping?.onRenameGroup,
    onRestore,
  });

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const hasGroups = (grouping?.groups.length ?? 0) > 0;
  const isEmpty =
    !isLoading &&
    conversations.length === 0 &&
    !hasGroups &&
    sidebar.editing == null;
  const hasError = errorMessage != null;
  const sections = buildConversationSections(
    conversations,
    grouping?.groups ?? [],
    new Date(),
  );
  const hasMore =
    onLoadMore != null &&
    conversations.length < (totalCount ?? conversations.length);

  // Handlers

  // Markup
  const header = (
    <ChatConversationSidebarHeader
      end={headerEnd}
      onNewChat={onNewChat}
      onNewGroup={grouping ? () => sidebar.startNewGroup(null) : null}
    />
  );

  const skeletons = (
    <div
      className="flex flex-col gap-1 px-2"
      data-testid="ChatConversationSidebar-loading"
    >
      {[0, 1, 2, 3].map((key) => (
        <Skeleton className="h-9 w-full" key={key} />
      ))}
    </div>
  );

  const empty = (
    <Empty
      className="px-2 py-6 text-center"
      data-testid="ChatConversationSidebar-empty"
    >
      <p className="text-sm font-medium">{copy.emptyTitle}</p>
      <p className="text-muted-foreground text-xs">{copy.emptyDescription}</p>
    </Empty>
  );

  const list = (
    <ChatConversationSections
      activeConversationId={activeConversationId ?? null}
      grouping={grouping}
      onSelect={onSelect}
      sections={sections}
      sidebar={sidebar}
    />
  );
  const failed = hasError ? (
    <ChatConversationListError errorMessage={errorMessage} onRetry={onRetry} />
  ) : null;
  const listOrEmpty = isEmpty ? (failed ?? empty) : list;

  const loadMore = (
    <div className="px-2 py-1">
      <Button
        className="w-full"
        data-testid="ChatConversationSidebar-load-more"
        disabled={isLoadingMore}
        onClick={onLoadMore}
        size="sm"
        type="button"
        variant="ghost"
      >
        {copy.loadMore}
      </Button>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={cn('flex h-full min-h-0 flex-col', className)}
      data-testid="ChatConversationSidebar"
    >
      {hideHeader ? null : header}
      <ScrollArea className="min-h-0 flex-1">
        <ChatConversationDndContext
          conversations={conversations}
          grouping={grouping}
        >
          {isLoading ? skeletons : listOrEmpty}
        </ChatConversationDndContext>
        {hasMore ? loadMore : null}
      </ScrollArea>
    </div>
  );
};
