import { ChatConversationSheet } from '@openthrottle/react-router-chat';
import { Button } from '@openthrottle/react-router-shadcn';
import { PanelRight } from 'lucide-react';
import * as React from 'react';

import { HOME_SESSION_DRAWER_COPY } from '~/routing/home/data/copy';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';

export interface HomeConversationToolbarProps {
  /** Id of the conversation currently loaded in the thread, if any. */
  activeConversationId: string | null;
  /** Persisted-conversation list backing the sheet (list + rename + delete/undo). */
  conversationList: UseConversationListResult;
  /** Clears the thread for a new conversation. */
  onNewChat: () => void;
  /** Opens the session drawer sheet. */
  onOpenSessionDrawer: () => void;
  /** Restores the chosen conversation into the thread. */
  onSelectConversation: (conversationId: string) => void;
}

/**
 * @description The home route's top strip on small screens — the trigger for
 * the persisted conversation sheet (history, rename, delete, new chat) and the
 * session drawer sheet. From md
 * up the docked conversations column (GlobalConversationDock) replaces it. Extracted from the
 * route so the route file stays inside the 210-line cap.
 */
export const HomeConversationToolbar = (
  props: HomeConversationToolbarProps,
): React.ReactElement => {
  const {
    activeConversationId,
    conversationList,
    onNewChat,
    onOpenSessionDrawer,
    onSelectConversation,
  } = props;

  // Hooks

  // Setup

  // Handlers
  // The list loads once on mount; a failure then (expired session, server
  // still booting) would otherwise stick until reload. Opening the sheet after
  // a failure re-requests it.
  const handleOpenChange = (open: boolean): void => {
    if (open && conversationList.errorMessage != null) {
      conversationList.refresh();
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex items-center gap-2 px-4 pt-4 md:hidden"
      data-testid="home-conversation-toolbar"
    >
      <ChatConversationSheet
        activeConversationId={activeConversationId}
        conversations={conversationList.conversations}
        errorMessage={conversationList.errorMessage}
        isLoading={conversationList.isLoading}
        isLoadingMore={conversationList.isLoadingMore}
        onDelete={conversationList.remove}
        onLoadMore={conversationList.loadMore}
        onNewChat={onNewChat}
        onOpenChange={handleOpenChange}
        onRename={conversationList.rename}
        onRestore={conversationList.restore}
        onRetry={conversationList.refresh}
        onSelect={onSelectConversation}
        side="left"
        totalCount={conversationList.totalCount}
      />
      <Button
        aria-label={HOME_SESSION_DRAWER_COPY.show}
        className="ml-auto shrink-0 pointer-coarse:size-11"
        data-testid="home-session-drawer-trigger"
        onClick={onOpenSessionDrawer}
        size="icon"
        type="button"
        variant="ghost"
      >
        <PanelRight aria-hidden={true} className="size-4" />
      </Button>
    </div>
  );
};
