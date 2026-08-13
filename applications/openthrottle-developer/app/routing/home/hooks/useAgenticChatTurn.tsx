import {
  useAgenticChatTurn as useSharedAgenticChatTurn,
  type UseAgenticChatTurnResult,
} from '@openthrottle/react-router-chat';
import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

/**
 * The route-independent action constants are single-sourced in
 * `@openthrottle/react-router-chat`; re-exported so existing importers (e.g.
 * `useConversationList`) keep their import path.
 */
export {
  AGENT_CONVERSATIONS_ACTION,
  CONVERSATION_STREAM_ACTION,
} from '@openthrottle/react-router-chat';
export type { UseAgenticChatTurnResult };

/**
 * @description Thin developer-app wrapper over the shared
 * {@link useSharedAgenticChatTurn}: injects this app's browser graphql-ws client
 * and its generated `ConversationStreamChunkAdded` subscription document. The
 * turn lifecycle itself is single-sourced in `@openthrottle/react-router-chat`
 * so the home route, header chat, and the admin app cannot drift.
 */
export function useAgenticChatTurn(): UseAgenticChatTurnResult {
  return useSharedAgenticChatTurn({
    streamClient: getGraphqlWsClient(),
    streamDocument: ConversationStreamChunkAddedDocument,
  });
}
