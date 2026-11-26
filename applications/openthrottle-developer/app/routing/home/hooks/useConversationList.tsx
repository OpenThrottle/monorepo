import type {
  UseConversationListOptions as SharedConversationListOptions,
  UseConversationListResult as SharedConversationListResult,
} from '@openthrottle/react-router-chat';

import { useConversationListContext } from '~/global/hooks/useConversationListContext';

/** The shared hook's result, re-typed here so existing importers keep this path. */
export type UseConversationListResult = SharedConversationListResult;

/**
 * The conversations-list hook is single-sourced in
 * `@openthrottle/react-router-chat`, and the app shares one instance of it
 * (`ConversationListProvider`) so the chat route and the dock see the same
 * rows. This wrapper keeps the import path for existing importers
 * (`useHeaderChatController`, `_index`, `HomeComposer`, `useHomeComposer`) and
 * their mocks.
 */
export function useConversationList(
  options: SharedConversationListOptions,
): UseConversationListResult {
  // Hooks
  const { list: conversationList } = useConversationListContext(options);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return conversationList;
}
