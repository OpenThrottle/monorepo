import * as React from 'react';
import {
  Button,
  Empty,
  ScrollArea,
  Skeleton,
} from '@openthrottle/react-router-shadcn';
import { MessageSquarePlus } from 'lucide-react';
import clsx from 'clsx';
import { ChatConversationDeleteDialog } from './ChatConversationDeleteDialog';
import { ChatConversationRow } from './ChatConversationRow';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { useChatConversationSidebar } from '../hooks/use-chat-conversation-sidebar';
import type { AgentConversationListItem } from '../types';

export interface ChatConversationSidebarProps {
  /** Currently-open conversation, highlighted in the list; null/undefined for a fresh thread. */
  readonly activeConversationId?: string | null;
  readonly className?: string;
  /** The conversations to list (already paginated by the consumer). */
  readonly conversations: readonly AgentConversationListItem[];
  /**
   * Suppress the built-in header row (title + New chat). Set when a wrapper —
   * e.g. {@link ChatConversationSheet} — supplies its own header/title so the
   * two don't duplicate.
   */
  readonly hideHeader?: boolean;
  /** True while the first page loads — renders skeleton rows instead of the list. */
  readonly isLoading?: boolean;
  /** True while a load-more request is in flight — disables the button. */
  readonly isLoadingMore?: boolean;
  /** Soft-delete a conversation (confirmed via an in-component dialog first). */
  readonly onDelete: (conversationId: string) => void;
  /** Fetch the next page; omit to hide the load-more affordance. */
  readonly onLoadMore?: () => void;
  /** Start a fresh conversation (clears the active thread). */
  readonly onNewChat: () => void;
  /** Commit an inline rename (only fired with a non-empty, trimmed title). */
  readonly onRename: (conversationId: string, title: string) => void;
  /** Open a conversation (restore its thread). */
  readonly onSelect: (conversationId: string) => void;
  /**
   * Total server-side conversation count. When greater than the number of loaded
   * rows (and {@link onLoadMore} is supplied), the load-more affordance shows.
   */
  readonly totalCount?: number;
}

/**
 * @description Fully-controlled, presentational conversations list for the chat
 * sidebar (home route) and the header switcher. Renders each conversation as a
 * selectable row (title + relative timestamp + active highlight) with inline
 * rename (Enter commits, Escape cancels) and a confirm-guarded soft-delete, plus
 * a New chat action and an optional Load more affordance. Loading and empty
 * states are handled. The package owns no data or fetching — the consumer
 * supplies the rows and every handler.
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
    hideHeader = false,
    isLoading = false,
    isLoadingMore = false,
    onDelete,
    onLoadMore,
    onNewChat,
    onRename,
    onSelect,
    totalCount,
  } = props;

  // Hooks
  const {
    cancelRename,
    confirmDelete,
    draftTitle,
    editingId,
    onRenameKeyDown,
    pendingDeleteId,
    requestDelete,
    resetPendingDelete,
    setDraftTitle,
    startRename,
  } = useChatConversationSidebar({ onDelete, onRename });

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const isEmpty = !isLoading && conversations.length === 0;
  const hasMore =
    onLoadMore != null &&
    conversations.length < (totalCount ?? conversations.length);

  // Handlers

  // Markup
  const header = (
    <div className="flex items-center justify-between gap-2 px-2 py-1.5">
      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {copy.title}
      </span>
      <Button
        aria-label={copy.newChat}
        data-testid="ChatConversationSidebar-new-chat"
        onClick={onNewChat}
        size="sm"
        type="button"
        variant="ghost"
      >
        <MessageSquarePlus className="size-4" />
        {copy.newChat}
      </Button>
    </div>
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

  const rows = conversations.map((conversation) => (
    <ChatConversationRow
      conversation={conversation}
      draftTitle={draftTitle}
      isActive={conversation.id === activeConversationId}
      isEditing={conversation.id === editingId}
      key={conversation.id}
      onCancelRename={cancelRename}
      onDraftTitleChange={setDraftTitle}
      onRenameKeyDown={(event) => onRenameKeyDown(event, conversation.id)}
      onRequestDelete={() => requestDelete(conversation.id)}
      onSelect={() => onSelect(conversation.id)}
      onStartRename={() => startRename(conversation)}
    />
  ));

  const loadMore = hasMore ? (
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
  ) : null;

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex h-full min-h-0 flex-col', className)}
      data-testid="ChatConversationSidebar"
    >
      {hideHeader ? null : header}
      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          skeletons
        ) : isEmpty ? (
          empty
        ) : (
          <div className="flex flex-col gap-px pb-1">{rows}</div>
        )}
        {loadMore}
      </ScrollArea>

      <ChatConversationDeleteDialog
        onConfirm={confirmDelete}
        onDismiss={resetPendingDelete}
        open={pendingDeleteId != null}
      />
    </div>
  );
};
