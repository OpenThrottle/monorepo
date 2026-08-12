import * as React from 'react';
import { useFetcher } from 'react-router';
import type {
  ChatMessage,
  ChatTokenUsage,
  LoadAgentConversationMessagesResult,
} from '@openthrottle/react-router-chat';
import {
  deriveRunPhaseFromElapsed,
  sumUsage,
} from '@openthrottle/react-router-chat';
import { useConversationStream } from '~/routing/home/hooks/useConversationStream';
import type { StartActionResult } from '~/routes/resources.conversation-stream';

/** Route-independent action both the home route and the header chat post to. */
export const CONVERSATION_STREAM_ACTION = '/resources/conversation-stream';

/** Route-independent action for persisted-conversation data ops (restore, list, …). */
export const AGENT_CONVERSATIONS_ACTION = '/resources/agent-conversations';

/**
 * Stable empty seed: the home/header surfaces have no conversation id in the URL
 * to seed history from, so the thread starts empty and fills from the stream.
 */
const EMPTY_SEED: readonly ChatMessage[] = [];

/** How many times one logical turn auto-retries before surfacing manual Retry. */
const MAX_AUTO_RETRIES = 1;

/**
 * Client stall watchdog window (ms): if a turn is pending but no chunk has
 * arrived for this long, assume the subscription died and recover. Set above the
 * server idle backstop (150s default) so the server's retryable terminal chunk
 * is preferred whenever it can still reach the client; the watchdog only covers
 * a silently-dead subscription.
 */
const CLIENT_STALL_TIMEOUT_MS = 180_000;

export interface UseAgenticChatTurnResult {
  /**
   * True when the last turn ended in a retryable timeout and the single
   * automatic retry is already spent — the UI should offer a manual Retry.
   */
  readonly canRetry: boolean;
  readonly conversationId: string | null;
  readonly error: string | null;
  readonly isStreaming: boolean;
  /** User messages + streamed assistant turns (placeholders flagged `pending`). */
  readonly messages: ChatMessage[];
  /** Manually replay the last turn after the auto-retry was exhausted. */
  readonly onRetry: () => void;
  /** Cancel the in-flight turn. */
  readonly onStop: () => void;
  /** Clear the thread for a fresh conversation (New chat). */
  readonly reset: () => void;
  /**
   * Restore a persisted conversation: seed its id (re-keying the live stream)
   * and hydrate its messages from the load-messages resource action.
   */
  readonly restore: (params: { conversationId: string }) => void;
  /**
   * Cumulative token usage across all assistant turns in this thread (best
   * effort; empty when no backend reported counts). Feeds the composer's
   * running {@link ChatUsageCounter}.
   */
  readonly sessionUsage: ChatTokenUsage;
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
  // True across the brief gap between a recovery (auto/manual) firing and the
  // replayed turn's new pending id arriving, so the composer never flickers out
  // of its streaming state mid-retry.
  const [isRetrying, setIsRetrying] = React.useState(false);
  // Set once the single auto-retry is spent on a timed-out turn → the UI offers
  // a manual Retry (Task 6).
  const [canRetry, setCanRetry] = React.useState(false);
  // A 1s heartbeat that advances only while a turn is pending, so the pending
  // placeholder's phase can escalate over the pre-content gap (connecting →
  // waiting → still-working) without any chunk arriving to force a re-render.
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());
  // Wall-clock start of the current turn, captured at submit/replay so elapsed
  // time spans the whole perceived wait (including the start round-trip).
  const turnStartedAtRef = React.useRef<number | null>(null);

  const cancelFetcher = useFetcher();
  const localIdRef = React.useRef(0);
  const startFetcher = useFetcher<StartActionResult>();
  const restoreFetcher = useFetcher<LoadAgentConversationMessagesResult>();

  // Last submitted turn, remembered so a stall/timeout can replay it verbatim
  // without re-appending the user bubble (it is already in the thread).
  const lastTurnRef = React.useRef<{
    fields: Record<string, string>;
    message: string;
  } | null>(null);
  // Auto-retries already spent on the current logical turn (loop guard).
  const retryCountRef = React.useRef(0);

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

      if (!isPendingTurn) {
        return base;
      }

      // Prefer a server-reported phase (from a keepalive ping — names the model
      // or a starting tool) when one has arrived; otherwise escalate the phase
      // from elapsed time so the indicator reads "Connecting…" → "Waiting for
      // the model…" → "Still working…" instead of a static spinner.
      const serverPhase = stream.phaseByMessageId.get(message.id);
      if (serverPhase !== undefined) {
        return {
          ...base,
          pending: true,
          phase: serverPhase.phase,
          phaseDetail: serverPhase.detail,
        };
      }

      const elapsedMs = Math.max(
        0,
        nowMs - (turnStartedAtRef.current ?? nowMs),
      );
      return {
        ...base,
        pending: true,
        phase: deriveRunPhaseFromElapsed(elapsedMs),
      };
    });
  }, [
    messages,
    nowMs,
    pendingAssistantId,
    stream.phaseByMessageId,
    streamedById,
  ]);

  const isStreaming =
    startFetcher.state !== 'idle' ||
    stream.isStreaming ||
    pendingAssistantId !== null ||
    isRetrying;

  // Accumulate every turn's usage event into one running session total for the
  // composer counter. Each assistant message carries at most one usage event
  // (the reducer/persisted folder merge per-step counts), so summing across
  // turns yields the conversation total; empty when nothing was reported.
  const sessionUsage = React.useMemo<ChatTokenUsage>(() => {
    let total: ChatTokenUsage = {};
    for (const message of messagesView) {
      for (const event of message.events ?? []) {
        if (event.kind === 'usage' && event.usage !== undefined) {
          total = sumUsage(total, event.usage);
        }
      }
    }

    return total;
  }, [messagesView]);

  // Handlers
  const submitTurn = (
    message: string,
    fields: Record<string, string>,
  ): void => {
    // Remember the turn and reset the retry budget so a stall/timeout can replay
    // it, and clear any prior manual-retry state.
    lastTurnRef.current = { fields, message };
    retryCountRef.current = 0;
    turnStartedAtRef.current = Date.now();
    setCanRetry(false);
    setError(null);
    setIsRetrying(false);

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

  /**
   * Recover a stalled turn by replaying the last (message, fields). Auto-retries
   * at most {@link MAX_AUTO_RETRIES} times per logical turn, then surfaces manual
   * Retry. `cancelFirst` cancels a possibly-still-live server turn before
   * resubmitting (client-side stall); a server-emitted retryable terminal has
   * already ended the turn, so it resubmits directly. The user bubble is NOT
   * re-appended — it is already in the thread; the server resolves session/resume
   * from conversation metadata like any follow-up turn.
   */
  const recover = (options: { cancelFirst: boolean }): void => {
    const lastTurn = lastTurnRef.current;
    if (lastTurn === null) {
      return;
    }

    if (retryCountRef.current >= MAX_AUTO_RETRIES) {
      // Auto-retry exhausted → stop and offer manual Retry.
      setPendingAssistantId(null);
      setIsRetrying(false);
      setCanRetry(true);
      setError('The response timed out. Retry?');
      return;
    }

    retryCountRef.current += 1;
    turnStartedAtRef.current = Date.now();
    setCanRetry(false);
    setError(null);
    setPendingAssistantId(null);
    setIsRetrying(true);

    if (options.cancelFirst && conversationId) {
      cancelFetcher.submit(
        { conversationId, intent: 'cancel' },
        { action: CONVERSATION_STREAM_ACTION, method: 'post' },
      );
    }

    startFetcher.submit(
      {
        conversationId: conversationId ?? '',
        intent: 'start',
        message: lastTurn.message,
        ...lastTurn.fields,
      },
      { action: CONVERSATION_STREAM_ACTION, method: 'post' },
    );
  };

  // Effects call the latest `recover` through a ref so they need not list it as
  // a dependency (it closes over changing state each render).
  const recoverRef = React.useRef(recover);
  recoverRef.current = recover;

  // Manual Retry (Task 6 button): reset the auto-retry budget and replay once.
  const onRetry = (): void => {
    retryCountRef.current = 0;
    setCanRetry(false);
    recover({ cancelFirst: false });
  };

  const onStop = (): void => {
    // Stopping is deliberate — never auto-retry a user-cancelled turn.
    retryCountRef.current = MAX_AUTO_RETRIES;
    setCanRetry(false);
    setIsRetrying(false);

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

  // Restore a persisted conversation: seed the id synchronously (so the live
  // subscription re-keys to that thread's topic) and fetch its messages; the
  // effect below swaps them in when the load resolves.
  const restore = (params: { conversationId: string }): void => {
    lastTurnRef.current = null;
    retryCountRef.current = 0;
    setCanRetry(false);
    setIsRetrying(false);
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
    lastTurnRef.current = null;
    retryCountRef.current = 0;
    setCanRetry(false);
    setIsRetrying(false);
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
      // A failed (re)start must never leave the composer wedged mid-retry.
      setIsRetrying(false);
      setError(result.errorMessage ?? 'Failed to start the conversation.');
      return;
    }

    setConversationId(result.conversationId);

    if (result.assistantMessageId) {
      // The replayed turn's stream has begun → leave the retry bridge state.
      setIsRetrying(false);
      const assistantId = result.assistantMessageId;
      setPendingAssistantId(assistantId);
      setMessages((previous) =>
        previous.some((message) => message.id === assistantId)
          ? previous
          : [...previous, { body: '', id: assistantId, role: 'assistant' }],
      );
    }
  }, [startFetcher.data]);

  // Recover on a retryable timeout terminal for the current pending turn: the
  // server already ended the turn, so replay directly (no cancel). The loop
  // guard in `recover` caps this at one automatic retry, then surfaces manual
  // Retry. This owns retryable terminals; the clear-pending effect skips them.
  React.useEffect(() => {
    if (
      pendingAssistantId !== null &&
      stream.retryableIds.has(pendingAssistantId)
    ) {
      recoverRef.current({ cancelFirst: false });
    }
  }, [pendingAssistantId, stream.retryableIds]);

  // Clear the pending flag once the started turn reaches its terminal `done`
  // chunk (success or fatal error), so the composer leaves its streaming state.
  // Retryable timeouts are handled by the recovery effect above.
  React.useEffect(() => {
    if (
      pendingAssistantId !== null &&
      stream.completedIds.has(pendingAssistantId) &&
      !stream.retryableIds.has(pendingAssistantId)
    ) {
      setPendingAssistantId(null);
    }
  }, [pendingAssistantId, stream.completedIds, stream.retryableIds]);

  // Stall watchdog: if a turn is pending but no chunk arrives for the stall
  // window (a silently-dead subscription — the server terminal never reached
  // us), cancel the possibly-live server turn and replay once. The timer resets
  // on every chunk (lastActivityAt changes) and is cleared on unmount / pending
  // clear / new conversation, so the composer can never hang.
  React.useEffect(() => {
    if (pendingAssistantId === null) {
      return;
    }

    const timer = setTimeout(() => {
      recoverRef.current({ cancelFirst: true });
    }, CLIENT_STALL_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [pendingAssistantId, stream.lastActivityAt]);

  // Heartbeat: while a turn is pending, tick `nowMs` every second so the pending
  // placeholder's elapsed-based phase advances even when no chunk arrives. The
  // interval only runs during the gap and is cleared on pending clear / unmount.
  React.useEffect(() => {
    if (pendingAssistantId === null) {
      return;
    }

    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1_000);

    return () => {
      clearInterval(timer);
    };
  }, [pendingAssistantId]);

  // Hydrate the thread from a restored conversation once its messages load. The
  // load-messages helper already maps rows to ChatMessage[]; a load error
  // surfaces without clobbering the (already re-keyed) id.
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
    canRetry,
    conversationId,
    error,
    isStreaming,
    messages: messagesView,
    onRetry,
    onStop,
    reset,
    restore,
    sessionUsage,
    setError,
    submitTurn,
  };
}
