import * as React from 'react';
import { useFetcher } from 'react-router';
import type {
  ChatMessage,
  LoadAgentConversationMessagesResult,
} from '@openthrottle/react-router-chat';
import { useConversationStream } from '~/routing/chat/hooks/useConversationStream';
import type { StartActionResult } from '~/routes/resources.conversation-stream';

/** Route-independent action the admin header chat posts to. */
export const CONVERSATION_STREAM_ACTION = '/resources/conversation-stream';

/** Route-independent action for persisted-conversation data ops (restore, list, …). */
export const AGENT_CONVERSATIONS_ACTION = '/resources/agent-conversations';

/**
 * Stable empty seed: the header surface has no conversation id in the URL to
 * seed history from, so the thread starts empty and fills from the stream.
 */
const EMPTY_SEED: readonly ChatMessage[] = [];

export interface UseAgenticChatTurnResult {
  readonly conversationId: string | null;
  readonly error: string | null;
  readonly isStreaming: boolean;
  readonly messages: ChatMessage[];
  readonly onStop: () => void;
  /** Clear the thread for a fresh conversation (New chat). */
  readonly reset: () => void;
  /** Restore a persisted conversation: seed its id + hydrate its messages. */
  readonly restore: (params: { conversationId: string }) => void;
  readonly setError: (message: string | null) => void;
  readonly submitTurn: (
    message: string,
    fields: Record<string, string>,
  ) => void;
}

/**
 * @description Encapsulates a single agentic streaming turn for the admin header
 * chat: local thread state, start/cancel fetchers to
 * {@link CONVERSATION_STREAM_ACTION}, the live {@link useConversationStream}
 * subscription, and the pending-placeholder overlay. Admin-local copy of the
 * developer hook (full consolidation deferred to d246beb9).
 */
export function useAgenticChatTurn(): UseAgenticChatTurnResult {
  // Hooks
  const [conversationId, setConversationId] = React.useState<string | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [pendingAssistantId, setPendingAssistantId] = React.useState<string | null>(null); // prettier-ignore

  const cancelFetcher = useFetcher();
  const localIdRef = React.useRef(0);
  const startFetcher = useFetcher<StartActionResult>();
  const restoreFetcher = useFetcher<LoadAgentConversationMessagesResult>();

  // Setup
  const stream = useConversationStream({
    conversationId,
    seedMessages: EMPTY_SEED,
  });

  const streamedById = React.useMemo(
    () => new Map(stream.messages.map((message) => [message.id, message])),
    [stream.messages],
  );

  const messagesView = React.useMemo(() => {
    return messages.map((message) => {
      const streamed = streamedById.get(message.id);
      const base =
        streamed === undefined
          ? message
          : streamed.events !== undefined
            ? { ...message, body: streamed.body, events: streamed.events }
            : { ...message, body: streamed.body };

      const hasTimeline = base.events !== undefined && base.events.length > 0;
      const stillEmpty = (base.body?.trim() ?? '') === '' && !hasTimeline;
      const isPendingTurn = message.id === pendingAssistantId && stillEmpty;

      return isPendingTurn ? { ...base, pending: true } : base;
    });
  }, [messages, pendingAssistantId, streamedById]);

  const isStreaming =
    startFetcher.state !== 'idle' ||
    stream.isStreaming ||
    pendingAssistantId !== null;

  // Handlers
  const submitTurn = (
    message: string,
    fields: Record<string, string>,
  ): void => {
    localIdRef.current += 1;
    const userId = `local-user-${localIdRef.current}`;
    setMessages((previous) => [
      ...previous,
      { body: message, id: userId, role: 'user' },
    ]);

    startFetcher.submit(
      {
        conversationId: conversationId ?? '',
        intent: 'start',
        message,
        ...fields,
      },
      { action: CONVERSATION_STREAM_ACTION, method: 'post' },
    );
  };

  const onStop = (): void => {
    if (!conversationId) {
      return;
    }

    setPendingAssistantId(null);

    cancelFetcher.submit(
      { conversationId, intent: 'cancel' },
      { action: CONVERSATION_STREAM_ACTION, method: 'post' },
    );
  };

  // Restore a persisted conversation: seed the id (re-keying the live stream)
  // and fetch its messages; the effect below swaps them in when they load.
  const restore = (params: { conversationId: string }): void => {
    setError(null);
    setPendingAssistantId(null);
    setConversationId(params.conversationId);
    restoreFetcher.submit(
      { conversationId: params.conversationId, intent: 'load-messages' },
      { action: AGENT_CONVERSATIONS_ACTION, method: 'post' },
    );
  };

  // New chat: drop the id + thread so the next turn starts a fresh conversation.
  const reset = (): void => {
    setError(null);
    setPendingAssistantId(null);
    setConversationId(null);
    setMessages([]);
  };

  // Life Cycle
  React.useEffect(() => {
    const result = startFetcher.data;
    if (!result) {
      return;
    }

    if (result.errorMessage || !result.conversationId) {
      setError(result.errorMessage ?? 'Failed to start the conversation.');
      return;
    }

    setConversationId(result.conversationId);

    if (result.assistantMessageId) {
      const assistantId = result.assistantMessageId;
      setPendingAssistantId(assistantId);
      setMessages((previous) =>
        previous.some((message) => message.id === assistantId)
          ? previous
          : [...previous, { body: '', id: assistantId, role: 'assistant' }],
      );
    }
  }, [startFetcher.data]);

  React.useEffect(() => {
    if (
      pendingAssistantId !== null &&
      stream.completedIds.has(pendingAssistantId)
    ) {
      setPendingAssistantId(null);
    }
  }, [pendingAssistantId, stream.completedIds]);

  // Hydrate the thread from a restored conversation once its messages load.
  React.useEffect(() => {
    const result = restoreFetcher.data;
    if (!result) {
      return;
    }

    if (result.errorMessage) {
      setError(result.errorMessage);
      return;
    }

    setMessages([...result.messages]);
  }, [restoreFetcher.data]);

  return {
    conversationId,
    error,
    isStreaming,
    messages: messagesView,
    onStop,
    reset,
    restore,
    setError,
    submitTurn,
  };
}
