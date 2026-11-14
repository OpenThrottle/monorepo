import * as React from 'react';

import { writeConversationIdParam } from '~/routing/home/utils/conversation-url';

export interface UseConversationUrlSyncOptions {
  /** The live turn's conversation id; null until the server assigns one. */
  readonly conversationId: string | null;
  /** Private (non-persisted) turns have no row to reopen, so no id is written. */
  readonly persist: boolean;
}

export type UseConversationUrlSyncResult = void;

/**
 * @description Reflects the live conversation id as `?conversationId=<id>` so a
 * reload reopens it (see `writeConversationIdParam` for why it avoids a router
 * navigation). Clearing on New chat is the route's job.
 */
export const useConversationUrlSync = (
  options: UseConversationUrlSyncOptions,
): UseConversationUrlSyncResult => {
  const { conversationId, persist } = options;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (conversationId == null || !persist) {
      return;
    }

    writeConversationIdParam(conversationId);
  }, [conversationId, persist]);

  // 🔌 Short Circuit
};
