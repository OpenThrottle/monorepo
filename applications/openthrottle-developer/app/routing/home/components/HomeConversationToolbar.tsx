import * as React from 'react';
import { ChatConversationSheet } from '@openthrottle/react-router-chat';
import type { UseConversationListResult } from '~/routing/home/hooks/useConversationList';

export interface HomeConversationToolbarProps {
  /** Id of the conversation currently loaded in the thread, if any. */
  activeConversationId: string | null;
  /** Persisted-conversation list backing the sheet (list + rename + delete). */
  conversationList: UseConversationListResult;
  /** Clears the thread for a new conversation. */
  onNewChat: () => void;
  /** Restores the chosen conversation into the thread. */
  onSelectConversation: (conversationId: string) => void;
}

/**
 * @description The home route's top strip — the trigger for the persisted
 * conversation sheet (history, rename, delete, new chat). Extracted from the
 * route so the route file stays inside the 210-line cap.
 */
export const HomeConversationToolbar = (
  props: HomeConversationToolbarProps,
): React.ReactElement => {
  const {
    activeConversationId,
    conversationList,
    onNewChat,
    onSelectConversation,
  } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex items-center gap-2 px-4 pt-4 md:px-8 md:pt-6 lg:px-12"
      data-testid="home-conversation-toolbar"
    >
      <ChatConversationSheet
        activeConversationId={activeConversationId}
        conversations={conversationList.conversations}
        isLoading={conversationList.isLoading}
        isLoadingMore={conversationList.isLoadingMore}
        onDelete={conversationList.remove}
        onLoadMore={conversationList.loadMore}
        onNewChat={onNewChat}
        onRename={conversationList.rename}
        onSelect={onSelectConversation}
        side="left"
        totalCount={conversationList.totalCount}
      />
    </div>
  );
};
