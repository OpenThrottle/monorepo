import * as React from 'react';
import { useFetcher } from 'react-router';
import { buildAgentsChatAssistantFooter } from '../agents-chat-footer';
import type {
  ChatMessage,
  ChatTurnResult,
  LoadAgentConversationMessagesResult,
} from '../types';
import { useChatMessages } from './use-chat-messages';
import type {
  UseChatMessagesOptions,
  UseChatMessagesResult,
} from './use-chat-messages';

export const SEND_AGENT_MESSAGE_INTENT = 'send-agent-message';
export const LOAD_AGENT_CONVERSATION_MESSAGES_INTENT =
  'load-agent-conversation-messages';

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

const clearConversationIdFromStorage = (key: string): void => {
  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
};

const parseChatTurnResult = (data: unknown): ChatTurnResult | null => {
  if (data === null || typeof data !== 'object') {
    return null;
  }

  const d = data as Record<string, unknown>;

  if (
    !('assistantText' in d) ||
    !('errorMessage' in d) ||
    !('mcpTool' in d) ||
    !('structuredPayloadJson' in d) ||
    !('toolMetadataJson' in d)
  ) {
    return null;
  }

  return {
    assistantText: (d.assistantText as string | null | undefined) ?? null,
    conversationId: (d.conversationId as string | null | undefined) ?? null,
    errorMessage: (d.errorMessage as string | null | undefined) ?? null,
    mcpTool: (d.mcpTool as string | null | undefined) ?? null,
    readOnlyAgentsChat:
      typeof d.readOnlyAgentsChat === 'boolean' ? d.readOnlyAgentsChat : true,
    routingConfidence:
      typeof d.routingConfidence === 'number' ? d.routingConfidence : null,
    routingReason: (d.routingReason as string | null | undefined) ?? null,
    structuredPayloadJson:
      (d.structuredPayloadJson as string | null | undefined) ?? null,
    toolMetadataJson: (d.toolMetadataJson as string | null | undefined) ?? null,
  };
};

const parseChatMessage = (value: unknown): ChatMessage | null => {
  if (value == null || typeof value !== 'object') {
    return null;
  }

  const message = value as Record<string, unknown>;

  if (
    typeof message.body !== 'string' ||
    typeof message.id !== 'string' ||
    typeof message.role !== 'string'
  ) {
    return null;
  }

  if (
    message.role !== 'assistant' &&
    message.role !== 'system' &&
    message.role !== 'user'
  ) {
    return null;
  }

  return {
    body: message.body,
    createdAt:
      typeof message.createdAt === 'string' ? message.createdAt : undefined,
    footer:
      typeof message.footer === 'string'
        ? message.footer
        : message.footer === null
          ? null
          : undefined,
    id: message.id,
    role: message.role,
  };
};

const parseLoadAgentConversationMessagesResult = (
  data: unknown,
): LoadAgentConversationMessagesResult | null => {
  if (data === null || typeof data !== 'object') {
    return null;
  }

  const d = data as Record<string, unknown>;

  if (!('errorMessage' in d) || !('messages' in d)) {
    return null;
  }

  const rawMessages = d.messages;

  if (!Array.isArray(rawMessages)) {
    return null;
  }

  const messages = rawMessages
    .map(parseChatMessage)
    .filter((message): message is ChatMessage => message != null);

  return {
    conversationId: (d.conversationId as string | null | undefined) ?? null,
    errorMessage: (d.errorMessage as string | null | undefined) ?? null,
    messages,
  };
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
    persist = false,
  } = options;

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

  const submitTurn = React.useCallback(
    (message: string) => {
      let activeConversationId = conversationId;

      if (!persist) {
        if (!activeConversationId) {
          activeConversationId = createConversationId();
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

  const { appendMessage, messages, sendUserMessage, setMessages } =
    useChatMessages({
      initialMessages,
      onSendMessage: (message) => {
        submitTurn(message);
      },
    });

  const startNewChat = React.useCallback((): void => {
    clearConversationIdFromStorage(conversationIdStorageKey);
    setConversationId(null);
    setErrorMessage(null);
    setLastTurn(null);
    setMessages([]);
  }, [conversationIdStorageKey, setMessages]);

  const isSubmitting =
    turnFetcher.state === 'submitting' || turnFetcher.state === 'loading';
  const isLoadingHistory =
    historyFetcher.state === 'submitting' || historyFetcher.state === 'loading';
  const composerDisabled = isSubmitting || isLoadingHistory;

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
