import * as React from 'react';
import { useFetcher } from 'react-router';
import type { ChatTurnResult } from '../types';
import { useChatMessages } from './use-chat-messages';
import type {
  UseChatMessagesOptions,
  UseChatMessagesResult,
} from './use-chat-messages';

export const SEND_AGENT_MESSAGE_INTENT = 'send-agent-message';

const DEFAULT_ACTION = '/';
const DEFAULT_CONVERSATION_STORAGE_KEY = 'openthrottle.chat.conversationId';

export interface UseChatTurnFetcherOptions {
  /** Root route path for the fetcher POST (default `/`). */
  readonly action?: string;
  readonly conversationIdStorageKey?: string;
  readonly initialConversationId?: string | null;
  readonly initialMessages?: UseChatMessagesOptions['initialMessages'];
  /** FormData `intent` value (default {@link SEND_AGENT_MESSAGE_INTENT}). */
  readonly intent?: string;
}

export interface UseChatTurnFetcherResult extends UseChatMessagesResult {
  readonly composerDisabled: boolean;
  readonly conversationId: string | null;
  readonly errorMessage: string | null;
  readonly isSubmitting: boolean;
  readonly lastTurn: ChatTurnResult | null;
}

const createConversationId = (): string => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const readConversationIdFromStorage = (key: string): string | null => {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }

  try {
    const value = sessionStorage.getItem(key);
    return value && value.trim().length > 0 ? value.trim() : null;
  } catch {
    return null;
  }
};

const writeConversationIdToStorage = (key: string, id: string): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(key, id);
  } catch {
    // Quota or private browsing — conversation id stays in memory only.
  }
};

const isChatTurnResult = (data: unknown): data is ChatTurnResult => {
  if (data === null || typeof data !== 'object') {
    return false;
  }

  return (
    'assistantText' in data &&
    'errorMessage' in data &&
    'toolMetadataJson' in data
  );
};

/**
 * @description Local chat thread plus root-route fetcher POST for `send-agent-message` / `agentsRunChatTurn`.
 */
export const useChatTurnFetcher = (
  options: UseChatTurnFetcherOptions = {},
): UseChatTurnFetcherResult => {
  const {
    action = DEFAULT_ACTION,
    conversationIdStorageKey = DEFAULT_CONVERSATION_STORAGE_KEY,
    initialConversationId = null,
    initialMessages,
    intent = SEND_AGENT_MESSAGE_INTENT,
  } = options;

  const fetcher = useFetcher<ChatTurnResult>();
  const wasSubmittingRef = React.useRef(false);

  const [conversationId, setConversationId] = React.useState<string | null>(
    () =>
      initialConversationId ??
      readConversationIdFromStorage(conversationIdStorageKey),
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [lastTurn, setLastTurn] = React.useState<ChatTurnResult | null>(null);

  const submitTurn = React.useCallback(
    (message: string) => {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        activeConversationId = createConversationId();
        setConversationId(activeConversationId);
        writeConversationIdToStorage(
          conversationIdStorageKey,
          activeConversationId,
        );
      }

      setErrorMessage(null);

      const body: Record<string, string> = {
        intent,
        message,
      };

      if (activeConversationId) {
        body.conversationId = activeConversationId;
      }

      fetcher.submit(body, {
        action,
        method: 'post',
      });
    },
    [action, conversationId, conversationIdStorageKey, fetcher, intent],
  );

  const { appendMessage, messages, sendUserMessage, setMessages } =
    useChatMessages({
      initialMessages,
      onSendMessage: (message) => {
        submitTurn(message);
      },
    });

  const isSubmitting =
    fetcher.state === 'submitting' || fetcher.state === 'loading';
  const composerDisabled = isSubmitting;

  React.useEffect(() => {
    if (fetcher.state === 'submitting' || fetcher.state === 'loading') {
      wasSubmittingRef.current = true;
      return;
    }

    if (fetcher.state !== 'idle' || !wasSubmittingRef.current) {
      return;
    }

    wasSubmittingRef.current = false;

    const turn = isChatTurnResult(fetcher.data) ? fetcher.data : null;
    if (!turn) {
      return;
    }

    setLastTurn(turn);

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
        role: 'assistant',
      });
    }
  }, [appendMessage, fetcher.data, fetcher.state]);

  return {
    appendMessage,
    composerDisabled,
    conversationId,
    errorMessage,
    isSubmitting,
    lastTurn,
    messages,
    sendUserMessage,
    setMessages,
  };
};
