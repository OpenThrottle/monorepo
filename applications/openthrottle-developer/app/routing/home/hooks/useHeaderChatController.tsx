import {
  CHAT_TOOLBAR_CONTEXT_SOURCES,
  CHAT_TOOLBAR_PERSONAS,
  type HeaderChatSurface,
  useHeaderChatController as useSharedHeaderChatController,
} from '@openthrottle/react-router-chat-state';

import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import {
  readChatOptionsCache,
  writeChatOptionsCache,
} from '~/routing/home/data/chat-options-cache';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

export interface UseHeaderChatControllerOptions {
  readonly enabled: boolean;
}

/** The shared header-chat surface, re-typed under this hook's result name. */
export type UseHeaderChatControllerResult = HeaderChatSurface;

/**
 * @description Thin developer-app wrapper over the shared
 * {@link useSharedHeaderChatController}: injects this app's browser graphql-ws
 * client + generated subscription document, its toolbar seeds, and its
 * client-side discovery cache. The header-chat composition itself is
 * single-sourced in `@openthrottle/react-router-chat-state` so the home route,
 * header dialog, and the admin app cannot drift.
 */
export function useHeaderChatController(
  options: UseHeaderChatControllerOptions,
): UseHeaderChatControllerResult {
  const { enabled } = options;

  // Hooks
  const surface = useSharedHeaderChatController({
    contextSources: CHAT_TOOLBAR_CONTEXT_SOURCES,
    enabled,
    optionsCache: {
      read: readChatOptionsCache,
      write: writeChatOptionsCache,
    },
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
