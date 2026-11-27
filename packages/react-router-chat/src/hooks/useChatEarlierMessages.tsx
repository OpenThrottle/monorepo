import * as React from 'react';
import { useFetcher } from 'react-router';

import { AGENT_CONVERSATIONS_ACTION } from '../data/chat-conversation-actions';
import type {
  ChatMessage,
  ChatThreadLoadEarlier,
  LoadAgentConversationMessagesResult,
} from '../types';

export interface UseChatEarlierMessagesOptions {
  /** The restored conversation the earlier pages belong to. */
  readonly conversationId: string | null;
  /** The thread's setter: earlier pages are prepended through it. */
  readonly setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export interface UseChatEarlierMessagesResult {
  readonly loadEarlier: ChatThreadLoadEarlier;
  /**
   * Record where the shown history starts: a restore's `firstMessageIndex`, or
   * null for a thread with no persisted history to page through.
   */
  readonly seed: (firstMessageIndex: number | null) => void;
}

/**
 * @description Pages back through a restored conversation for the thread's
 * Load earlier control. Each page is the rows just before the oldest one shown,
 * addressed by position from the oldest row (so turns sent since the restore
 * never shift it), and is prepended without duplicating a row already shown. A
 * page that lands after the thread moved to another conversation is dropped.
 */
export const useChatEarlierMessages = (
  options: UseChatEarlierMessagesOptions,
): UseChatEarlierMessagesResult => {
  const { conversationId, setMessages } = options;

  // Hooks
  const fetcher = useFetcher<LoadAgentConversationMessagesResult>();
  const [firstMessageIndex, setFirstMessageIndex] = React.useState<
    number | null
  >(null);

  // Setup
  const hasEarlier = firstMessageIndex !== null && firstMessageIndex > 0;
  const isLoading = fetcher.state !== 'idle';

  // Handlers
  const onLoadEarlier = (): void => {
    if (conversationId === null || !hasEarlier || isLoading) {
      return;
    }
    fetcher.submit(
      {
        before: String(firstMessageIndex),
        conversationId,
        intent: 'load-messages',
      },
      {
        action: AGENT_CONVERSATIONS_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  const seed = React.useCallback((next: number | null): void => {
    setFirstMessageIndex(next);
  }, []);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const result = fetcher.data;
    if (
      result === undefined ||
      result.errorMessage !== null ||
      result.conversationId !== conversationId
    ) {
      return;
    }

    setMessages((previous) => {
      const shown = new Set(previous.map((message) => message.id));
      const earlier = result.messages.filter((message) => {
        return !shown.has(message.id);
      });

      return [...earlier, ...previous];
    });
    setFirstMessageIndex(result.firstMessageIndex);
  }, [fetcher.data]);

  // 🔌 Short Circuit

  return {
    loadEarlier: { hasEarlier, isLoading, onLoadEarlier },
    seed,
  };
};
