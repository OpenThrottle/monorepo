import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
  useHeaderChatController as useSharedHeaderChatController,
  type HeaderChatSurface,
} from '@openthrottle/react-router-chat-state';
import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export type { HeaderChatSurface };

/**
 * @description Thin admin-app wrapper over the shared
 * {@link useSharedHeaderChatController}: injects this app's browser graphql-ws
 * client + generated subscription document and its toolbar seeds. Admin has no
 * client-side discovery cache, so it omits `optionsCache` and always probes
 * `/resources/chat-options`. The composition itself is single-sourced in
 * `@openthrottle/react-router-chat-state`.
 */
export function useHeaderChatController(args: {
  readonly enabled: boolean;
}): HeaderChatSurface {
  return useSharedHeaderChatController({
    contextSources: CHAT_TOOLBAR_CONTEXT_SOURCES,
    enabled: args.enabled,
    personasFallback: CHAT_TOOLBAR_PERSONAS,
    streamClient: getGraphqlWsClient(),
    streamDocument: ConversationStreamChunkAddedDocument,
  });
}
