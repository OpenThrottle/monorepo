import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
  useHeaderChatController as useSharedHeaderChatController,
  type HeaderChatSurface,
} from '@openthrottle/react-router-chat-state';
import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import {
  readChatOptionsCache,
  writeChatOptionsCache,
} from '~/routing/home/data/chat-options-cache';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export type { HeaderChatSurface };

/**
 * @description Thin developer-app wrapper over the shared
 * {@link useSharedHeaderChatController}: injects this app's browser graphql-ws
 * client + generated subscription document, its toolbar seeds, and its
 * client-side discovery cache. The header-chat composition itself is
 * single-sourced in `@openthrottle/react-router-chat-state` so the home route,
 * header dialog, and the admin app cannot drift.
 */
export function useHeaderChatController(args: {
  readonly enabled: boolean;
}): HeaderChatSurface {
  return useSharedHeaderChatController({
    contextSources: CHAT_TOOLBAR_CONTEXT_SOURCES,
    enabled: args.enabled,
    optionsCache: {
      read: readChatOptionsCache,
      write: writeChatOptionsCache,
    },
    personasFallback: CHAT_TOOLBAR_PERSONAS,
    streamClient: getGraphqlWsClient(),
    streamDocument: ConversationStreamChunkAddedDocument,
  });
}
