import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import type { GraphqlWsClient } from '@openthrottle/react-router-graphql';
import * as React from 'react';
import { useFetcher } from 'react-router';

import {
  CLIENT_STALL_TIMEOUT_MS,
  MAX_AUTO_RETRIES,
  MUTATION_STALL_TIMEOUT_MS,
} from '../config/chat-agentic-turn';
import type {
  ConversationStreamSubscriptionData,
  ConversationStreamSubscriptionVariables,
} from '../conversation-stream';
import { parseFileMentionsField } from '../conversation-stream-action';
import { EMPTY_CHAT_SEED } from '../data/chat-agentic-turn-seed';
import {
  AGENT_CONVERSATIONS_ACTION,
  CONVERSATION_STREAM_ACTION,
} from '../data/chat-conversation-actions';
import { deriveRunPhaseFromElapsed } from '../run-phase';
import type {
  ChatMessage,
  ChatPermissionResponder,
  ChatQueuedMessage,
  ChatStartActionResult,
  ChatThreadLoadEarlier,
  ChatTokenUsage,
  LoadAgentConversationMessagesResult,
} from '../types';
import { sumUsage } from '../usage';
import {
  appendAssistantPlaceholder,
  appendStreamedOnlyMessages,
  bakeStreamedMessages,
  didTurnFail,
  overlayStreamedMessage,
} from '../utils/agentic-chat-turn-messages';
import { useChatEarlierMessages } from './useChatEarlierMessages';
import { useChatMessageQueue } from './useChatMessageQueue';
import { useConversationStream } from './useConversationStream';

/**
 * Host-provided wiring for {@link useAgenticChatTurn}: the browser graphql-ws
 * client and the app's generated `ConversationStreamChunkAdded` subscription
 * document, injected so the turn logic itself is app-agnostic.
 * @public
 */
export interface UseAgenticChatTurnOptions {
  readonly streamClient: GraphqlWsClient | null;
  readonly streamDocument: TypedDocumentNode<
    ConversationStreamSubscriptionData,
    ConversationStreamSubscriptionVariables
  >;
}

/** @public */
export interface UseAgenticChatTurnResult {
  /**
   * True when the last turn ended in a retryable timeout and the single
   * automatic retry is already spent — the UI should offer a manual Retry.
   */
  readonly canRetry: boolean;
  /** Drop every queued message. */
  readonly clearQueue: () => void;
  readonly conversationId: string | null;
  /** Replace a queued message's text; an empty edit removes it. */
  readonly editQueued: (id: string, message: string) => void;
  readonly error: string | null;
  /**
   * True after Stop or a failed turn while messages are queued: nothing sends
   * on its own until {@link resumeQueue} or {@link sendQueuedNow}.
   */
  readonly isQueuePaused: boolean;
  readonly isStreaming: boolean;
  /** The thread's Load earlier control, for a restored conversation. */
  readonly loadEarlier: ChatThreadLoadEarlier;
  /** User messages + streamed assistant turns (placeholders flagged `pending`). */
  readonly messages: ChatMessage[];
  /** Answer a pending permission request: an option id, or null to cancel. */
  readonly onRespondToPermission: ChatPermissionResponder;
  /** Manually replay the last turn after the auto-retry was exhausted. */
  readonly onRetry: () => void;
  /** Cancel the in-flight turn, and pause the queue. */
  readonly onStop: () => void;
  /** Messages sent while a turn was running, oldest first. */
  readonly queuedMessages: readonly ChatQueuedMessage[];
  readonly removeQueued: (id: string) => void;
  /** Clear the thread for a fresh conversation (New chat). */
  readonly reset: () => void;
  /**
   * Restore a persisted conversation: seed its id (re-keying the live stream)
   * and hydrate its messages from the load-messages resource action.
   */
  readonly restore: (params: { conversationId: string }) => void;
  /** Un-pause the queue and send its oldest message now if nothing is running. */
  readonly resumeQueue: () => void;
  /**
   * Send one queued message now: cancel the running turn (if any), then start
   * this message as the next turn. Un-pauses the queue.
   */
  readonly sendQueuedNow: (id: string) => void;
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
   * to the conversation-stream resource action. While a turn is running (or
   * being cancelled) the message is queued instead, and sent as its own turn
   * once the running one ends successfully.
   */
  readonly submitTurn: (
    message: string,
    fields: Record<string, string>,
  ) => void;
}

interface RecoverOptions {
  readonly cancelFirst: boolean;
}

/**
 * @description Encapsulates a single agentic streaming turn: local thread state,
 * the start/cancel fetchers to {@link CONVERSATION_STREAM_ACTION}, the live
 * {@link useConversationStream} subscription, and the pending-placeholder
 * overlay. The caller owns the toolbar/selection state and builds the `fields`
 * payload; this hook owns the turn lifecycle so the home route and the global
 * header — across both the developer and admin apps — share one code path. The
 * host injects its ws client + generated subscription document via {@link
 * UseAgenticChatTurnOptions}. Every submit passes `defaultShouldRevalidate:
 * false`: a chat turn or message load changes nothing a page loader shows, and
 * without it React Router re-ran every matched loader (git/fs scans on
 * `/settings/repositories`) after each one.
 * @public
 */
export function useAgenticChatTurn(
  options: UseAgenticChatTurnOptions,
): UseAgenticChatTurnResult {
  const { streamClient, streamDocument } = options;

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
  // a manual Retry.
  const [canRetry, setCanRetry] = React.useState(false);
  // A 1s heartbeat that advances only while a turn is pending, so the pending
  // placeholder's phase can escalate over the pre-content gap (connecting →
  // waiting → still-working) without any chunk arriving to force a re-render.
  const [nowMs, setNowMs] = React.useState<number>(() => Date.now());
  // Wall-clock start of the current turn, captured at submit/replay so elapsed
  // time spans the whole perceived wait (including the start round-trip).
  const turnStartedAtRef = React.useRef<number | null>(null);

  const cancelFetcher = useFetcher();
  const permissionFetcher = useFetcher();
  const localIdRef = React.useRef(0);
  const startFetcher = useFetcher<ChatStartActionResult>();
  const restoreFetcher = useFetcher<LoadAgentConversationMessagesResult>();
  const earlier = useChatEarlierMessages({ conversationId, setMessages });

  // Last submitted turn, remembered so a stall/timeout can replay it verbatim
  // without re-appending the user bubble (it is already in the thread).
  const lastTurnRef = React.useRef<{
    fields: Record<string, string>;
    message: string;
  } | null>(null);
  // Auto-retries already spent on the current logical turn (loop guard).
  const retryCountRef = React.useRef(0);
  // Effects call the latest `recover` through a ref so they need not list it as
  // a dependency (it closes over changing state each render). Assigned under
  // Handlers, right after `recover` is declared.
  const recoverRef = React.useRef<(recoverOptions: RecoverOptions) => void>(
    () => undefined,
  );
  const queue = useChatMessageQueue();
  // The assistant id of the most recent turn, kept after its pending flag clears
  // so the drain can tell whether that turn failed.
  const lastAssistantIdRef = React.useRef<string | null>(null);
  // A queued message the user chose to "Send now" while a turn was running: it
  // waits here for the cancel to settle, then starts ahead of the queue.
  const sendNowRef = React.useRef<ChatQueuedMessage | null>(null);
  // `isBusy` on the previous render, so the drain fires on the busy→idle edge.
  const wasBusyRef = React.useRef(false);
  // Set by `startTurn`, cleared once a render observes `isBusy`. Covers the gap
  // before the start fetcher reports itself in flight, so a second submit in
  // the same tick queues instead of starting a parallel turn. (The fetcher's
  // submit can re-render synchronously while its state still reads idle.)
  const startPendingRef = React.useRef(false);
  // The start result the result effect last handled. For the one render where
  // the fetcher reads idle but that effect has not yet set the pending id,
  // `isStreaming` would blip false — which the queue drain would read as "the
  // turn ended" and start a queued message on top of the running turn.
  const handledStartResultRef = React.useRef<ChatStartActionResult | undefined>(undefined); // prettier-ignore

  const streamedByIdRef = React.useRef<ReadonlyMap<string, ChatMessage>>(
    new Map(),
  );
  // Assistant turns this hook already tracks: started here, or adopted from the
  // stream. A streamed turn outside this set that has not finished is one this
  // tab did not start (reopened mid-turn, or started in another tab), and gets
  // adopted as the pending turn once. Never re-adopting is what keeps Stop and
  // a stall recovery, which clear the pending id early, from re-arming it.
  const trackedTurnIdsRef = React.useRef<Set<string>>(new Set());
  // Turns this tab started: their prompt is already in the thread as the local
  // bubble, so the stream's copy of it is skipped.
  const startedTurnIdsRef = React.useRef<Set<string>>(new Set());
  const conversationIdRef = React.useRef<string | null>(null);

  const stream = useConversationStream({
    client: streamClient,
    conversationId,
    document: streamDocument,
    seedMessages: EMPTY_CHAT_SEED,
  });

  // Setup
  // Streamed assistant turns overlay the ordered placeholders by message id,
  // carrying both the flat body (fallback) and the structured `events` timeline.
  const streamedById = React.useMemo(
    () => new Map(stream.messages.map((message) => [message.id, message])),
    [stream.messages],
  );
  // Read by the start-result effect, which must see the overlay and id from
  // before it re-keys the stream without listing them as dependencies.
  streamedByIdRef.current = streamedById;
  conversationIdRef.current = conversationId;

  const messagesView = React.useMemo(() => {
    const thread = appendStreamedOnlyMessages(messages, stream.messages);

    return thread.map((message) => {
      const streamed = streamedById.get(message.id);
      const base = overlayStreamedMessage(message, streamed);

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
    stream.messages,
    stream.phaseByMessageId,
    streamedById,
  ]);

  const hasUnhandledStartResult =
    startFetcher.data !== undefined &&
    startFetcher.data !== handledStartResultRef.current;
  const isStreaming =
    startFetcher.state !== 'idle' ||
    hasUnhandledStartResult ||
    stream.isStreaming ||
    pendingAssistantId !== null ||
    isRetrying;
  // A cancel still in flight counts as busy: starting a turn before the server
  // has aborted the old one would be refused (one turn per conversation).
  const isBusy = isStreaming || cancelFetcher.state !== 'idle';
  if (isBusy) {
    startPendingRef.current = false;
  }

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
  const startTurn = (
    message: string,
    fields: Readonly<Record<string, string>>,
  ): void => {
    startPendingRef.current = true;
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
    // The just-sent row knows only the uploaded ids; the persisted row brings the rest.
    const attachments = (
      parseFileMentionsField(fields.attachmentIds ?? null) ?? []
    ).map((id) => ({
      byteSize: null,
      height: null,
      id,
      mimeType: null,
      originalName: null,
      width: null,
    }));
    setMessages((previous) => [
      ...previous,
      {
        ...(attachments.length > 0 ? { attachments } : {}),
        body: message,
        id: userId,
        role: 'user',
      },
    ]);

    startFetcher.submit(
      {
        conversationId: conversationId ?? '',
        intent: 'start',
        message,
        ...fields,
      },
      {
        action: CONVERSATION_STREAM_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  const submitTurn = (
    message: string,
    fields: Record<string, string>,
  ): void => {
    if (isBusy || startPendingRef.current) {
      queue.enqueue(message, fields);
      return;
    }
    startTurn(message, fields);
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
  const recover = (recoverOptions: RecoverOptions): void => {
    const lastTurn = lastTurnRef.current;
    if (lastTurn === null) {
      // An adopted turn (started elsewhere) has nothing here to replay: stop
      // waiting on it rather than spin forever.
      setPendingAssistantId(null);
      setIsRetrying(false);
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

    if (recoverOptions.cancelFirst && conversationId) {
      cancelFetcher.submit(
        { conversationId, intent: 'cancel' },
        {
          action: CONVERSATION_STREAM_ACTION,
          defaultShouldRevalidate: false,
          method: 'post',
        },
      );
    }

    startFetcher.submit(
      {
        conversationId: conversationId ?? '',
        intent: 'start',
        message: lastTurn.message,
        ...lastTurn.fields,
      },
      {
        action: CONVERSATION_STREAM_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  recoverRef.current = recover;

  // Manual Retry (button): reset the auto-retry budget and replay once.
  const onRetry = (): void => {
    retryCountRef.current = 0;
    setCanRetry(false);
    recover({ cancelFirst: false });
  };

  const onRespondToPermission: ChatPermissionResponder = (
    requestId,
    optionId,
  ) => {
    if (!conversationId) {
      return;
    }

    permissionFetcher.submit(
      {
        conversationId,
        intent: 'respond-permission',
        optionId: optionId ?? '',
        requestId,
      },
      {
        action: CONVERSATION_STREAM_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  const cancelTurn = (): void => {
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
      {
        action: CONVERSATION_STREAM_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  const onStop = (): void => {
    queue.pause();
    cancelTurn();
  };

  const sendQueuedNow = (id: string): void => {
    const item = queue.take(id);
    if (item === undefined) {
      return;
    }
    queue.resume();
    if (isBusy || startPendingRef.current) {
      sendNowRef.current = item;
      cancelTurn();
      return;
    }
    startTurn(item.message, item.fields);
  };

  const resumeQueue = (): void => {
    queue.resume();
    if (isBusy || startPendingRef.current) {
      return;
    }
    const next = queue.take();
    if (next !== undefined) {
      startTurn(next.message, next.fields);
    }
  };

  const clearQueue = (): void => {
    sendNowRef.current = null;
    queue.clear();
  };

  // Restore a persisted conversation: seed the id synchronously (so the live
  // subscription re-keys to that thread's topic) and fetch its messages; the
  // effect below swaps them in when the load resolves.
  const restore = (params: { conversationId: string }): void => {
    clearQueue();
    trackedTurnIdsRef.current.clear();
    lastTurnRef.current = null;
    retryCountRef.current = 0;
    setCanRetry(false);
    setIsRetrying(false);
    setError(null);
    setPendingAssistantId(null);
    setConversationId(params.conversationId);
    earlier.seed(null);
    restoreFetcher.submit(
      { conversationId: params.conversationId, intent: 'load-messages' },
      {
        action: AGENT_CONVERSATIONS_ACTION,
        defaultShouldRevalidate: false,
        method: 'post',
      },
    );
  };

  // New chat: drop the id + thread so the next turn starts a fresh conversation.
  const reset = (): void => {
    clearQueue();
    trackedTurnIdsRef.current.clear();
    lastTurnRef.current = null;
    retryCountRef.current = 0;
    setCanRetry(false);
    setIsRetrying(false);
    setError(null);
    setPendingAssistantId(null);
    setConversationId(null);
    setMessages([]);
    earlier.seed(null);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const result = startFetcher.data;
    if (!result) {
      return;
    }
    handledStartResultRef.current = result;

    if (result.errorMessage || !result.conversationId) {
      // A failed (re)start must never leave the composer wedged mid-retry.
      setIsRetrying(false);
      setError(result.errorMessage ?? 'Failed to start the conversation.');
      return;
    }

    // A start that lands on a different id (every Private-mode turn mints its
    // own) re-keys the live stream, which drops what it accumulated. Keep the
    // replies already streamed by baking them into the thread first.
    if (result.conversationId !== conversationIdRef.current) {
      const streamed = streamedByIdRef.current;
      setMessages((previous) => bakeStreamedMessages(previous, streamed));
    }

    setConversationId(result.conversationId);

    if (result.assistantMessageId) {
      // The replayed turn's stream has begun → leave the retry bridge state.
      setIsRetrying(false);
      const assistantId = result.assistantMessageId;
      startedTurnIdsRef.current.add(assistantId);
      trackedTurnIdsRef.current.add(assistantId);
      lastAssistantIdRef.current = assistantId;
      setPendingAssistantId(assistantId);
      setMessages((previous) =>
        appendAssistantPlaceholder(previous, assistantId),
      );
    }
  }, [startFetcher.data]);

  // Adopt a running turn this tab did not start: reopened mid-turn, the stream
  // replays a reply with no terminal chunk under an id the thread never saw.
  // Making it the pending turn arms the running indicator, heartbeat, stall
  // watchdog and Stop exactly as for a turn started here.
  React.useEffect(() => {
    if (pendingAssistantId !== null || startFetcher.state !== 'idle') {
      return;
    }

    const running = stream.messages.find((message) => {
      return (
        message.role === 'assistant' &&
        !stream.completedIds.has(message.id) &&
        !trackedTurnIdsRef.current.has(message.id)
      );
    });
    if (running === undefined) {
      return;
    }

    trackedTurnIdsRef.current.add(running.id);
    lastAssistantIdRef.current = running.id;
    turnStartedAtRef.current = Date.now();
    setPendingAssistantId(running.id);
  }, [
    pendingAssistantId,
    startFetcher.state,
    stream.completedIds,
    stream.messages,
  ]);

  // Show a prompt sent from another tab: the stream carries each turn's user
  // message, and one for a turn this tab did not start is appended unless the
  // thread already holds it (a restore loaded the persisted row). Waits while a
  // start is in flight, so this tab's own prompt is known as its own first.
  React.useEffect(() => {
    if (startPendingRef.current || startFetcher.state !== 'idle') {
      return;
    }

    const foreign = Array.from(stream.prompts.entries())
      .filter(([turnId]) => !startedTurnIdsRef.current.has(turnId))
      .map(([, prompt]) => prompt);
    if (foreign.length === 0) {
      return;
    }

    setMessages((previous) => {
      const known = new Set(previous.map((message) => message.id));
      const missing = foreign.filter((prompt) => !known.has(prompt.id));
      if (missing.length === 0) {
        return previous;
      }

      return [
        ...previous,
        ...missing.map((prompt): ChatMessage => {
          return { body: prompt.body, id: prompt.id, role: 'user' };
        }),
      ];
    });
  }, [startFetcher.state, stream.prompts]);

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

  // "Send now": start the chosen message as soon as the cancel request settles.
  // The server frees the conversation the moment it aborts, so there is no need
  // to wait for the old reply's last chunks to drain to the client. (The drain
  // effect below still sends it if no cancel request was made.)
  React.useEffect(() => {
    const sendNow = sendNowRef.current;
    if (cancelFetcher.state !== 'idle' || sendNow === null) {
      return;
    }
    sendNowRef.current = null;
    startTurn(sendNow.message, sendNow.fields);
  }, [cancelFetcher.state]);

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

  // Mutation-in-flight watchdog: cover the window the chunk-based watchdog above
  // cannot — the start mutation is in flight but has not yet yielded an assistant
  // id (so there is no pending turn and no chunk to time). A stalled/wedged
  // `startConversationStream` would otherwise leave the composer busy forever with
  // no recovery. While the start fetcher is busy AND no pending id exists, arm a
  // recovery timer; on timeout replay once (nothing streamed → no server cancel),
  // then fall through to manual Retry via the loop guard in `recover`. Disarms the
  // instant the assistant id arrives (handoff to the chunk watchdog) or the
  // fetcher goes idle.
  React.useEffect(() => {
    if (
      startFetcher.state === 'idle' ||
      pendingAssistantId !== null ||
      canRetry
    ) {
      return;
    }

    const timer = setTimeout(() => {
      recoverRef.current({ cancelFirst: false });
    }, MUTATION_STALL_TIMEOUT_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [canRetry, startFetcher.state, pendingAssistantId]);

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

  // Drain the queue on the busy→idle edge: a "Send now" message goes first;
  // otherwise the oldest queued message starts as the next turn — unless the
  // queue is paused or the turn that just ended failed (then pause, so a
  // follow-up never runs on top of an error the user has not seen). Stall
  // recovery keeps `isBusy` true across its replay, so it never drains early.
  React.useEffect(() => {
    const wasBusy = wasBusyRef.current;
    wasBusyRef.current = isBusy;
    if (isBusy || !wasBusy) {
      return;
    }

    const sendNow = sendNowRef.current;
    if (sendNow !== null) {
      sendNowRef.current = null;
      startTurn(sendNow.message, sendNow.fields);
      return;
    }

    if (queue.isPaused || queue.items.length === 0) {
      return;
    }

    const lastAssistant = messagesView.find((message) => {
      return message.id === lastAssistantIdRef.current;
    });
    if (error !== null || canRetry || didTurnFail(lastAssistant)) {
      queue.pause();
      return;
    }

    const next = queue.take();
    if (next !== undefined) {
      startTurn(next.message, next.fields);
    }
  }, [isBusy]);

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

    earlier.seed(result.firstMessageIndex);
    const { activeTurn } = result;
    if (activeTurn === null) {
      setMessages([...result.messages]);
      return;
    }

    // The turn is still running: show its placeholder now, rather than a bare
    // user message until the subscription replays the first chunk, which then
    // fills this same id. If the turn ended during the load, the clear-pending
    // effect sees its terminal chunk and clears it straight away.
    const assistantId = activeTurn.assistantMessageId;
    const startedAtMs = Date.parse(activeTurn.startedAt);
    trackedTurnIdsRef.current.add(assistantId);
    lastAssistantIdRef.current = assistantId;
    turnStartedAtRef.current = Number.isNaN(startedAtMs)
      ? Date.now()
      : startedAtMs;
    setMessages(appendAssistantPlaceholder([...result.messages], assistantId));
    setPendingAssistantId(assistantId);
  }, [restoreFetcher.data]);

  // 🔌 Short Circuit

  return {
    canRetry,
    clearQueue,
    conversationId,
    editQueued: queue.edit,
    error,
    isQueuePaused: queue.isPaused,
    isStreaming,
    loadEarlier: earlier.loadEarlier,
    messages: messagesView,
    onRespondToPermission,
    onRetry,
    onStop,
    queuedMessages: queue.items,
    removeQueued: queue.remove,
    reset,
    restore,
    resumeQueue,
    sendQueuedNow,
    sessionUsage,
    setError,
    submitTurn,
  };
}
