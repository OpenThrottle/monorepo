import {
  useAgenticChatTurn as useSharedAgenticChatTurn,
  type UseAgenticChatTurnResult as SharedAgenticChatTurnResult,
} from '@openthrottle/react-router-chat';

import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

/** The shared hook's result, re-typed here so existing importers keep this path. */
export type UseAgenticChatTurnResult = SharedAgenticChatTurnResult;

/**
 * @description Thin developer-app wrapper over the shared
 * {@link useSharedAgenticChatTurn}: injects this app's browser graphql-ws client
 * and its generated `ConversationStreamChunkAdded` subscription document. The
 * turn lifecycle itself is single-sourced in `@openthrottle/react-router-chat`
 * so the home route, header chat, and the admin app cannot drift.
 */
export function useAgenticChatTurn(): UseAgenticChatTurnResult {
  // Hooks
  const turn = useSharedAgenticChatTurn({
    streamClient: getGraphqlWsClient(),
    streamDocument: ConversationStreamChunkAddedDocument,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return turn;
}
