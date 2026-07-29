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
  Button,
  Empty,
  Input,
  ScrollArea,
  Skeleton,
} from '@openthrottle/react-router-shadcn';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { CHAT_CONVERSATION_SIDEBAR_COPY } from '../data/chat-conversation-sidebar.copy';
import { formatRelativeChatTimestamp } from '../utils/index';
import type { AgentConversationListItem } from '../types';

export interface ChatConversationSidebarProps {
  /** Currently-open conversation, highlighted in the list; null/undefined for a fresh thread. */
  readonly activeConversationId?: string | null;
  readonly className?: string;
  /** The conversations to list (already paginated by the consumer). */
  readonly conversations: readonly AgentConversationListItem[];
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
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftTitle, setDraftTitle] = React.useState('');
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(
    null,
  );

  // Setup
  const copy = CHAT_CONVERSATION_SIDEBAR_COPY;
  const isEmpty = !isLoading && conversations.length === 0;
  const hasMore =
    onLoadMore != null &&
    conversations.length < (totalCount ?? conversations.length);

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

  const confirmDelete = (): void => {
    if (pendingDeleteId != null) {
      onDelete(pendingDeleteId);
    }
    setPendingDeleteId(null);
  };

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

  const rows = conversations.map((conversation) => {
    const isActive = conversation.id === activeConversationId;
    const isEditing = conversation.id === editingId;
    const label =
      conversation.title != null && conversation.title.trim() !== ''
        ? conversation.title
        : copy.untitled;

    if (isEditing) {
      return (
        <div className="px-2 py-0.5" key={conversation.id}>
          <Input
            aria-label={copy.renamePlaceholder}
            autoFocus={true}
            className="h-9"
            data-testid={`ChatConversationSidebar-rename-input-${conversation.id}`}
            onBlur={cancelRename}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={(event) => onRenameKeyDown(event, conversation.id)}
            placeholder={copy.renamePlaceholder}
            value={draftTitle}
          />
        </div>
      );
    }

    return (
      <div
        className={clsx(
          'group/row flex items-center gap-1 rounded-md px-2 py-0.5',
          isActive && 'bg-accent',
        )}
        key={conversation.id}
      >
        <button
          aria-current={isActive ? 'true' : undefined}
          className="hover:bg-accent/50 flex min-w-0 flex-1 flex-col items-start rounded-md px-1 py-1 text-left"
          data-testid={`ChatConversationSidebar-select-${conversation.id}`}
          onClick={() => onSelect(conversation.id)}
          type="button"
        >
          <span className="w-full truncate text-sm">{label}</span>
          <span className="text-muted-foreground text-xs">
            {formatRelativeChatTimestamp(conversation.updatedAt)}
          </span>
        </button>
        <Button
          aria-label={`Rename ${label}`}
          className="opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          data-testid={`ChatConversationSidebar-rename-${conversation.id}`}
          onClick={() => startRename(conversation)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Pencil className="size-3.5" />
        </Button>
        <Button
          aria-label={`Delete ${label}`}
          className="text-muted-foreground hover:text-destructive opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
          data-testid={`ChatConversationSidebar-delete-${conversation.id}`}
          onClick={() => setPendingDeleteId(conversation.id)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    );
  });

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
      {header}
      <ScrollArea className="min-h-0 flex-1">
        {isLoading ? (
          skeletons
        ) : isEmpty ? (
          empty
        ) : (
          <div className="flex flex-col gap-0.5 pb-1">{rows}</div>
        )}
        {loadMore}
      </ScrollArea>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        open={pendingDeleteId != null}
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
              onClick={confirmDelete}
            >
              {copy.deleteConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
