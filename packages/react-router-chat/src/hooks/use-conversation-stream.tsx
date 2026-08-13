/**
 * @description Live conversation stream for the agentic chat surfaces. Mirrors
 * the loader-seed + subscription-delta pattern: history comes from the loader
 * (`seedMessages`), token deltas arrive via the `conversationStreamChunkAdded`
 * subscription and accumulate into an assistant message keyed by messageId,
 * dedup'd by chunk sortOrder. SSR-safe: with no browser ws client the hook
 * returns just the seed. When the loader later revalidates and the persisted
 * assistant row (same id) appears in `seedMessages`, the seed version wins
 * (dedup by id).
 *
 * The pure accumulation (`reduceStreamChunk` / `toThreadMessages` / `StreamState`)
 * lives in `../conversation-stream`; this hook is the thin shell that wires a
 * host-provided graphql-ws client + the (host-generated) subscription document
 * to that reducer, shared by both the developer and admin apps and the home
 * route so the surfaces cannot drift.
 */
import * as React from 'react';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import {
  useSubscription,
  type GraphqlWsClient,
} from '@openthrottle/react-router-graphql';
import {
  INITIAL_STREAM_STATE,
  reduceStreamChunk,
  toThreadMessages,
  type ChatStreamChunk,
} from '../conversation-stream';
import type { ResolvedRunPhase } from '../run-phase';
import type { ChatMessage } from '../types';
import type { StreamState } from '../conversation-stream';

/**
 * The subscription payload shape the stream reads: one `conversationStreamChunkAdded`
 * chunk per event. Structural, so each app's generated subscription result is
 * assignable.
 * @public
 */
export interface ConversationStreamSubscriptionData {
  readonly conversationStreamChunkAdded: ChatStreamChunk;
}

/** Variables for the conversation-stream subscription. @public */
export interface ConversationStreamSubscriptionVariables {
  readonly [key: string]: unknown;
  readonly conversationId: string;
}

/** @public */
export interface UseConversationStreamArgs {
  /**
   * Host-provided browser graphql-ws client (null during SSR / before
   * `window.env` is available), so the shared hook never reaches into a
   * per-app client singleton.
   */
  readonly client: GraphqlWsClient | null;
  readonly conversationId: string | null;
  /** The host app's generated `ConversationStreamChunkAdded` subscription document. */
  readonly document: TypedDocumentNode<
    ConversationStreamSubscriptionData,
    ConversationStreamSubscriptionVariables
  >;
  readonly seedMessages: readonly ChatMessage[];
}

/** @public */
export interface UseConversationStreamResult {
  /** messageIds whose stream has reached its terminal `done` chunk. */
  readonly completedIds: ReadonlySet<string>;
  readonly isStreaming: boolean;
  /**
   * `Date.now()` of the most recently received chunk (null before the first),
   * re-keyed to null on a new conversation. Drives the client stall watchdog:
   * its identity changes on every chunk so a consumer can reset a timer off it.
   */
  readonly lastActivityAt: number | null;
  readonly messages: ChatMessage[];
  /**
   * Server-reported run phase keyed by messageId (from live `keepalive` pings),
   * so the running indicator can name the model/tool during the pre-content gap.
   */
  readonly phaseByMessageId: ReadonlyMap<string, ResolvedRunPhase>;
  /**
   * messageIds whose terminal chunk was a retryable timeout (safe to auto-retry
   * rather than a fatal error). Subset of {@link UseConversationStreamResult.completedIds}.
   */
  readonly retryableIds: ReadonlySet<string>;
}

/** @public */
export function useConversationStream(
  args: UseConversationStreamArgs,
): UseConversationStreamResult {
  const { client, conversationId, document, seedMessages } = args;

  // Hooks
  const [state, setState] = React.useState<StreamState>(INITIAL_STREAM_STATE);
  // Wall-clock of the last received chunk, tracked outside the pure reducer so
  // the stall watchdog can tell "no activity for N ms" from "still streaming".
  const [lastActivityAt, setLastActivityAt] = React.useState<number | null>(
    null,
  );

  // Handlers
  const onData = (data: ConversationStreamSubscriptionData): void => {
    setState((previous) =>
      reduceStreamChunk(previous, data.conversationStreamChunkAdded),
    );
    setLastActivityAt(Date.now());
  };

  // Life Cycle
  React.useEffect(() => {
    setState(INITIAL_STREAM_STATE);
    setLastActivityAt(null);

    // 🪝 New conversation → drop any prior accumulation.
  }, [conversationId]);

  useSubscription(
    client,
    document,
    { conversationId: conversationId ?? '' },
    { onData },
    Boolean(conversationId),
  );

  // 🔌 Short Circuit

  const messages = React.useMemo(
    () => toThreadMessages(seedMessages, state.bodies, state.events),
    [seedMessages, state.bodies, state.events],
  );

  return {
    completedIds: state.completedIds,
    isStreaming: state.isStreaming,
    lastActivityAt,
    messages,
    phaseByMessageId: state.phaseByMessageId,
    retryableIds: state.retryableIds,
  };
}
