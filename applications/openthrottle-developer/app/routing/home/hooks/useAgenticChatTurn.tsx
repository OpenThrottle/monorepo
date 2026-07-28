import * as React from 'react';
import { useFetcher } from 'react-router';
import type { ChatMessage } from '@openthrottle/react-router-chat';
import { useConversationStream } from '~/routing/home/hooks/useConversationStream';
import type { StartActionResult } from '~/routes/resources.conversation-stream';

/** Route-independent action both the home route and the header chat post to. */
export const CONVERSATION_STREAM_ACTION = '/resources/conversation-stream';

/**
 * Stable empty seed: the home/header surfaces have no conversation id in the URL
 * to seed history from, so the thread starts empty and fills from the stream.
 */
const EMPTY_SEED: readonly ChatMessage[] = [];

export interface UseAgenticChatTurnResult {
  readonly conversationId: string | null;
  readonly error: string | null;
  readonly isStreaming: boolean;
  /** User messages + streamed assistant turns (placeholders flagged `pending`). */
  readonly messages: ChatMessage[];
  /** Cancel the in-flight turn. */
  readonly onStop: () => void;
  /** Surface a client-side validation error (e.g. "select a repository"). */
  readonly setError: (message: string | null) => void;
  /**
   * Start a turn: append the user message and POST `intent=start` + `fields`
   * (the backend-specific payload the caller builds from its toolbar selections)
   * to the conversation-stream resource action.
   */
  readonly submitTurn: (
    message: string,
    fields: Record<string, string>,
  ) => void;
}

/**
 * @description Encapsulates a single agentic streaming turn: local thread state,
 * the start/cancel fetchers to {@link CONVERSATION_STREAM_ACTION}, the live
 * {@link useConversationStream} subscription, and the pending-placeholder
 * overlay. The caller owns the toolbar/selection state and builds the `fields`
 * payload; this hook owns the turn lifecycle so the home route and the global
 * header can share one code path. (Developer-local for now; the admin app gets
 * its own copy in the parity task — full consolidation is deferred to d246beb9.)
 */
export function useAgenticChatTurn(): UseAgenticChatTurnResult {
  // Hooks
  const [conversationId, setConversationId] = React.useState<string | null>(
    null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  // The assistant turn started but not yet reached a terminal chunk — keeps the
  // composer in its streaming state and renders a running indicator on the
  // placeholder while a slow backend has produced nothing yet.
  const [pendingAssistantId, setPendingAssistantId] = React.useState<string | null>(null); // prettier-ignore

  const cancelFetcher = useFetcher();
  const localIdRef = React.useRef(0);
  const startFetcher = useFetcher<StartActionResult>();

  // Setup
  const stream = useConversationStream({
    conversationId,
    seedMessages: EMPTY_SEED,
  });

  // Streamed assistant turns overlay the ordered placeholders by message id,
  // carrying both the flat body (fallback) and the structured `events` timeline.
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

    // Leave the streaming state immediately; the terminal chunk may be missed
    // if the cancel lands before the stream published anything.
    setPendingAssistantId(null);

    cancelFetcher.submit(
      { conversationId, intent: 'cancel' },
      { action: CONVERSATION_STREAM_ACTION, method: 'post' },
    );
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

  // Clear the pending flag once the started turn reaches its terminal `done`
  // chunk (success or error), so the composer leaves its streaming state.
  React.useEffect(() => {
    if (
      pendingAssistantId !== null &&
      stream.completedIds.has(pendingAssistantId)
    ) {
      setPendingAssistantId(null);
    }
  }, [pendingAssistantId, stream.completedIds]);

  return {
    conversationId,
    error,
    isStreaming,
    messages: messagesView,
    onStop,
    setError,
    submitTurn,
  };
}
