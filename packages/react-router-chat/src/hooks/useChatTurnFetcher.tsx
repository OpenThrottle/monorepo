import * as React from 'react';
import { useFetcher } from 'react-router';

import { buildAgentsChatAssistantFooter } from '../agents-chat-footer';
import {
  LOAD_AGENT_CONVERSATION_MESSAGES_INTENT,
  SEND_AGENT_MESSAGE_INTENT,
} from '../data/chat-turn-fetcher-intents';
import type {
  ChatTurnResult,
  LoadAgentConversationMessagesResult,
} from '../types';
import {
  clearConversationIdFromStorage,
  readConversationIdFromStorage,
  writeConversationIdToStorage,
} from '../utils/conversation-id-storage';
import { createUniqueId } from '../utils/create-unique-id';
import { parseChatTurnResult } from '../utils/parse-chat-turn-result';
import { parseLoadAgentConversationMessagesResult } from '../utils/parse-load-agent-conversation-messages-result';
import type {
  UseChatMessagesOptions,
  UseChatMessagesResult,
} from './useChatMessages';
import { useChatMessages } from './useChatMessages';

export interface UseChatTurnFetcherOptions {
  /** Root route path for the fetcher POST (default `/`). */
  readonly action?: string;
  readonly conversationIdStorageKey?: string;
  readonly initialConversationId?: string | null;
  readonly initialMessages?: UseChatMessagesOptions['initialMessages'];
  /** FormData `intent` value (default {@link SEND_AGENT_MESSAGE_INTENT}). */
  readonly intent?: string;
  /**
   * When true, POST `persist=true` and rely on the server for conversation ids;
   * loads stored history on mount when a conversation id exists in sessionStorage.
   */
  readonly persist?: boolean;
}

export interface UseChatTurnFetcherResult extends UseChatMessagesResult {
  readonly composerDisabled: boolean;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly isLoadingHistory: boolean;
  readonly isSubmitting: boolean;
  readonly lastTurn: ChatTurnResult | null;
  /**
   * Clears the stored conversation id and in-memory thread so the next persisted
   * send mints a new server conversation.
   */
  readonly startNewChat: () => void;
}

/**
 * @description Local chat thread plus root-route fetcher POST for `send-agent-message` / `agentsRunChatTurn`.
 */
export const useChatTurnFetcher = (
  options: UseChatTurnFetcherOptions = {},
): UseChatTurnFetcherResult => {
  const {
    action = '/',
    conversationIdStorageKey = 'openthrottle.chat.conversationId',
    initialConversationId = null,
    initialMessages,
    intent = SEND_AGENT_MESSAGE_INTENT,
    persist = false,
  } = options;

  // Hooks
  const turnFetcher = useFetcher<ChatTurnResult>();
  const historyFetcher = useFetcher<LoadAgentConversationMessagesResult>();
  const wasSubmittingRef = React.useRef(false);
  const historyRequestedRef = React.useRef(false);

  const [conversationId, setConversationId] = React.useState<string | null>(
    () =>
      initialConversationId ??
      readConversationIdFromStorage(conversationIdStorageKey),
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastTurn, setLastTurn] = React.useState<ChatTurnResult | null>(null);

  // Setup
  const isSubmitting =
    turnFetcher.state === 'submitting' || turnFetcher.state === 'loading';
  const isLoadingHistory =
    historyFetcher.state === 'submitting' || historyFetcher.state === 'loading';
  const composerDisabled = isSubmitting || isLoadingHistory;

  // Handlers
  const submitTurn = React.useCallback(
    (message: string) => {
      let activeConversationId = conversationId;

      if (!persist) {
        if (!activeConversationId) {
          activeConversationId = createUniqueId('conv');
          setConversationId(activeConversationId);
          writeConversationIdToStorage(
            conversationIdStorageKey,
            activeConversationId,
          );
        }
      }

      setErrorMessage(null);

      const body: Record<string, string> = {
        intent,
        message,
      };

      if (activeConversationId) {
        body.conversationId = activeConversationId;
      }

      if (persist) {
        body.persist = 'true';
      }

      turnFetcher.submit(body, {
        action,
        method: 'post',
      });
    },
    [
      action,
      conversationId,
      conversationIdStorageKey,
      intent,
      persist,
      turnFetcher,
    ],
  );

  // Declared here, not under Hooks: `onSendMessage` closes over `submitTurn`
  // above, and `startNewChat` below needs `setMessages` from this call.
  const { appendMessage, messages, sendUserMessage, setMessages } =
    useChatMessages({
      initialMessages,
      onSendMessage: (message) => {
        submitTurn(message);
      },
    });

  const startNewChat = React.useCallback((): void => {
    clearConversationIdFromStorage(conversationIdStorageKey);
    // Unlatch the one-shot history loader so a later persisted send (which can
    // mint a fresh stored id) is allowed to load history again on this mount.
    historyRequestedRef.current = false;
    setConversationId(null);
    setErrorMessage(null);
    setLastTurn(null);
    setMessages([]);
  }, [conversationIdStorageKey, setMessages]);

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!persist || historyRequestedRef.current) {
      return;
    }

    const storedConversationId = readConversationIdFromStorage(
      conversationIdStorageKey,
    );

    if (storedConversationId == null) {
      return;
    }

    historyRequestedRef.current = true;

    historyFetcher.submit(
      {
        conversationId: storedConversationId,
        intent: LOAD_AGENT_CONVERSATION_MESSAGES_INTENT,
      },
      {
        action,
        method: 'post',
      },
    );
  }, [action, conversationIdStorageKey, historyFetcher, persist]);

  React.useEffect(() => {
    if (historyFetcher.state !== 'idle' || historyFetcher.data == null) {
      return;
    }

    const result = parseLoadAgentConversationMessagesResult(
      historyFetcher.data,
    );

    if (result == null) {
      return;
    }

    if (result.errorMessage != null && result.errorMessage.length > 0) {
      setErrorMessage(result.errorMessage);
      setConversationId(null);
      clearConversationIdFromStorage(conversationIdStorageKey);
      return;
    }

    if (result.messages.length > 0) {
      setMessages(result.messages);
    }

    if (result.conversationId != null && result.conversationId.length > 0) {
      setConversationId(result.conversationId);
      writeConversationIdToStorage(
        conversationIdStorageKey,
        result.conversationId,
      );
    }
  }, [
    conversationIdStorageKey,
    historyFetcher.data,
    historyFetcher.state,
    setMessages,
  ]);

  React.useEffect(() => {
    if (turnFetcher.state === 'submitting' || turnFetcher.state === 'loading') {
      wasSubmittingRef.current = true;
      return;
    }

    if (turnFetcher.state !== 'idle' || !wasSubmittingRef.current) {
      return;
    }

    wasSubmittingRef.current = false;

    const turn = parseChatTurnResult(turnFetcher.data);
    if (!turn) {
      return;
    }

    setLastTurn(turn);

    if (turn.conversationId != null && turn.conversationId.length > 0) {
      setConversationId(turn.conversationId);
      writeConversationIdToStorage(
        conversationIdStorageKey,
        turn.conversationId,
      );
    }

    if (turn.errorMessage) {
      setErrorMessage(turn.errorMessage);
      appendMessage({
        body: turn.errorMessage,
        role: 'system',
      });
    }

    if (turn.assistantText) {
      appendMessage({
        body: turn.assistantText,
        footer: buildAgentsChatAssistantFooter(turn),
        role: 'assistant',
      });
    }
  }, [
    appendMessage,
    conversationIdStorageKey,
    turnFetcher.data,
    turnFetcher.state,
  ]);

  // 🔌 Short Circuit

  return {
    appendMessage,
    composerDisabled,
    conversationId,
    errorMessage,
    isLoadingHistory,
    isSubmitting,
    lastTurn,
    messages,
    sendUserMessage,
    setMessages,
    startNewChat,
  };
};
