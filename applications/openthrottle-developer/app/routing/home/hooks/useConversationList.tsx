import {
  useConversationList as useSharedConversationList,
  type UseConversationListResult as SharedConversationListResult,
} from '@openthrottle/react-router-chat';

/** The shared hook's result, re-typed here so existing importers keep this path. */
export type UseConversationListResult = SharedConversationListResult;

/**
 * The conversations-list hook is single-sourced in
 * `@openthrottle/react-router-chat`; this wrapper keeps the import path for
 * existing importers (`useHeaderChatController`, `_index`, `HomeComposer`,
 * `useHomeComposer`) and their mocks.
 */
export function useConversationList(): UseConversationListResult {
  // Hooks
  const conversationList = useSharedConversationList();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return conversationList;
}
