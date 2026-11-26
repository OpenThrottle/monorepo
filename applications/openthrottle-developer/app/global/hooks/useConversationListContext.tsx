import type { UseConversationListResult } from '@openthrottle/react-router-chat';
import { useConversationList } from '@openthrottle/react-router-chat';
import * as React from 'react';

import { ConversationListContext } from '~/global/config/ConversationListContext';

export interface UseConversationListContextOptions {
  /** Whether a list of its own may be fetched when no provider is mounted. */
  readonly enabled: boolean;
}

export interface UseConversationListContextResult {
  /** The chat route's open conversation as published, or null. */
  readonly activeConversationId: string | null;
  readonly list: UseConversationListResult;
  /** Publish the chat route's open conversation (a no-op without a provider). */
  readonly setActiveConversationId: (conversationId: string | null) => void;
}

/**
 * @description The shared conversation list from `ConversationListProvider`.
 * Without a provider (isolated tests, a surface mounted outside the root
 * layout) it falls back to a list of its own, which stays unfetched whenever a
 * provider is present so the app never loads the list twice.
 */
export const useConversationListContext = (
  options: UseConversationListContextOptions,
): UseConversationListContextResult => {
  const { enabled } = options;

  // Hooks
  const shared = React.useContext(ConversationListContext);
  const ownList = useConversationList({ enabled: enabled && shared == null });

  // Setup

  // Handlers
  const setActiveConversationId = (conversationId: string | null): void => {
    shared?.setActiveConversationId(conversationId);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (shared != null) {
    return shared;
  }

  return { activeConversationId: null, list: ownList, setActiveConversationId };
};
