import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
  type HeaderChatSurface,
  useHeaderChatController as useSharedHeaderChatController,
} from '@openthrottle/react-router-chat-state';

import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export interface UseHeaderChatControllerOptions {
  readonly enabled: boolean;
}

/** The shared header-chat surface, re-typed under this hook's result name. */
export type UseHeaderChatControllerResult = HeaderChatSurface;

/**
 * @description Thin admin-app wrapper over the shared
 * {@link useSharedHeaderChatController}: injects this app's browser graphql-ws
 * client + generated subscription document and its toolbar seeds. Admin has no
 * client-side discovery cache, so it omits `optionsCache` and always probes
 * `/resources/chat-options`. The composition itself is single-sourced in
 * `@openthrottle/react-router-chat-state`.
 */
export function useHeaderChatController(
  options: UseHeaderChatControllerOptions,
): UseHeaderChatControllerResult {
  const { enabled } = options;

  // Hooks
  const surface = useSharedHeaderChatController({
    contextSources: CHAT_TOOLBAR_CONTEXT_SOURCES,
    enabled,
    personasFallback: CHAT_TOOLBAR_PERSONAS,
    streamClient: getGraphqlWsClient(),
    streamDocument: ConversationStreamChunkAddedDocument,
  });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return surface;
}
