import { ChatConversationSidebar } from '@openthrottle/react-router-chat';
import { Button } from '@openthrottle/react-router-shadcn';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import * as React from 'react';

import { CONVERSATION_DOCK_COPY } from '~/global/data/copy';
import { useConversationDock } from '~/global/hooks/useConversationDock';
import type { ChatDockState } from '~/global/utils/chat-dock-cookie';

export interface GlobalConversationDockProps {
  /** Whether conversations may be fetched; false while logged out. */
  readonly enabled: boolean;
  /** The dock state the root loader read from the cookie. */
  readonly initialState: ChatDockState;
}

/**
 * @description The conversations column docked between the primary nav and
 * the page on every route (md and up; smaller screens keep the chat route's
 * conversation sheet). Collapses to a slim rail with a Show chats button.
 */
export const GlobalConversationDock = (
  props: GlobalConversationDockProps,
): React.ReactElement => {
  const { enabled, initialState } = props;

  // Hooks
  const dock = useConversationDock({ enabled, initialState });

  // Setup
  const copy = CONVERSATION_DOCK_COPY;
  const { list } = dock;

  // Handlers

  // Markup
  const collapseButton = (
    <Button
      aria-label={copy.collapse}
      data-testid="GlobalConversationDock-collapse"
      onClick={dock.toggleOpen}
      size="icon"
      title={copy.collapse}
      type="button"
      variant="ghost"
    >
      <PanelLeftClose className="size-4" />
    </Button>
  );

  const rail = (
    <div
      className="border-sidebar-border bg-sidebar sticky top-0 hidden h-svh w-10 shrink-0 flex-col items-center border-r py-2 md:flex"
      data-testid="GlobalConversationDock-rail"
    >
      <Button
        aria-label={copy.show}
        data-testid="GlobalConversationDock-show"
        onClick={dock.toggleOpen}
        size="icon"
        title={copy.show}
        type="button"
        variant="ghost"
      >
        <PanelLeftOpen className="size-4" />
      </Button>
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (!dock.isOpen) {
    return rail;
  }

  return (
    <aside
      aria-label={copy.region}
      className="border-sidebar-border bg-sidebar sticky top-0 hidden h-svh w-72 shrink-0 flex-col border-r py-1 md:flex"
      data-testid="GlobalConversationDock"
    >
      <ChatConversationSidebar
        activeConversationId={dock.activeConversationId}
        className="min-h-0 flex-1"
        conversations={list.conversations}
        errorMessage={list.errorMessage}
        grouping={dock.grouping}
        headerEnd={collapseButton}
        isLoading={list.isLoading}
        isLoadingMore={list.isLoadingMore}
        onDelete={list.remove}
        onLoadMore={list.loadMore}
        onNewChat={dock.newChat}
        onRename={list.rename}
        onRestore={list.restore}
        onRetry={list.refresh}
        onSelect={dock.selectConversation}
        totalCount={list.totalCount}
      />
    </aside>
  );
};
