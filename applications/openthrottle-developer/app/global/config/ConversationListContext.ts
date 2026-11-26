import type { UseConversationListResult } from '@openthrottle/react-router-chat';
import * as React from 'react';

/**
 * @description The one conversation list the app shares (dock, chat route,
 * header chat) plus the conversation the chat route has open. The chat route
 * learns a new conversation's id from its start action and writes it to the
 * URL with `history.replaceState`, which the router never sees — so it
 * publishes the id here instead, and the dock reads it.
 */
export interface ConversationListContextValue {
  /** The conversation open on the chat route, or null for a blank thread. */
  readonly activeConversationId: string | null;
  readonly list: UseConversationListResult;
  readonly setActiveConversationId: (conversationId: string | null) => void;
}

/** @description Provided by `ConversationListProvider` in the root layout. */
export const ConversationListContext =
  React.createContext<ConversationListContextValue | null>(null);
