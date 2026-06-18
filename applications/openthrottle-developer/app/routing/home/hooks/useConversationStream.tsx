/**
 * @description Live conversation stream for the home chat. Mirrors
 * usePlanOutputStream's loader-seed + subscription-delta pattern: history comes
 * from the loader (seedMessages), token deltas arrive via the
 * conversationStreamChunkAdded subscription and accumulate into an assistant
 * message keyed by messageId, dedup'd by chunk sortOrder. SSR-safe: with no
 * browser ws client the hook returns just the seed. When the loader later
 * revalidates and the persisted assistant row (same id) appears in seedMessages,
 * the seed version wins (dedup by id).
 */
import type { ChatMessage } from '@openthrottle/react-router-chat';
import { useSubscription } from '@openthrottle/react-router-graphql';
import * as React from 'react';
import type { ConversationStreamChunkAddedSubscription } from '~/__generated__/graphql';
import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type StreamChunk =
  ConversationStreamChunkAddedSubscription['conversationStreamChunkAdded'];

export interface StreamState {
  /** Accumulated assistant body keyed by messageId. */
  readonly bodies: ReadonlyMap<string, string>;
  /** True while a stream is in flight (between the first delta and `done`). */
  readonly isStreaming: boolean;
  /** Seen `messageId:sortOrder` keys for dedupe. */
  readonly seen: ReadonlySet<string>;
}

export const INITIAL_STREAM_STATE: StreamState = {
  bodies: new Map(),
  isStreaming: false,
  seen: new Set(),
};

/** Pure reducer: fold one streamed chunk into the accumulation state. */
export function reduceStreamChunk(
  state: StreamState,
  chunk: StreamChunk,
): StreamState {
  const dedupeKey = `${chunk.messageId}:${chunk.sortOrder}`;
  if (state.seen.has(dedupeKey)) {
    return state;
  }
  const seen = new Set(state.seen);
  seen.add(dedupeKey);

  const bodies = new Map(state.bodies);
  const current = bodies.get(chunk.messageId) ?? '';

  if (chunk.done) {
    if (chunk.error) {
      bodies.set(chunk.messageId, `${current}\n\n_Error: ${chunk.error}_`);
    }
    return { bodies, isStreaming: false, seen };
  }

  bodies.set(chunk.messageId, current + chunk.delta);
  return { bodies, isStreaming: true, seen };
}

/** Merge loader history with accumulated streamed assistant messages (seed wins by id). */
export function toThreadMessages(
  seedMessages: readonly ChatMessage[],
  bodies: ReadonlyMap<string, string>,
): ChatMessage[] {
  const seedIds = new Set(seedMessages.map((message) => message.id));
  const streamed: ChatMessage[] = Array.from(bodies.entries())
    .filter(([messageId]) => !seedIds.has(messageId))
    .map(([messageId, body]) => ({ body, id: messageId, role: 'assistant' }));
  return [...seedMessages, ...streamed];
}

export interface UseConversationStreamArgs {
  readonly conversationId: string | null;
  readonly seedMessages: readonly ChatMessage[];
}

export interface UseConversationStreamResult {
  readonly isStreaming: boolean;
  readonly messages: ChatMessage[];
}

export function useConversationStream(
  args: UseConversationStreamArgs,
): UseConversationStreamResult {
  const { conversationId, seedMessages } = args;

  // Hooks
  const [state, setState] = React.useState<StreamState>(INITIAL_STREAM_STATE);

  // Setup
  const client = React.useMemo(() => getGraphqlWsClient(), []);

  // Handlers
  const onData = (data: ConversationStreamChunkAddedSubscription): void => {
    setState((previous) =>
      reduceStreamChunk(previous, data.conversationStreamChunkAdded),
    );
  };

  // Life Cycle
  React.useEffect(() => {
    // New conversation → drop any prior accumulation.
    setState(INITIAL_STREAM_STATE);
  }, [conversationId]);

  useSubscription(
    client,
    ConversationStreamChunkAddedDocument,
    { conversationId: conversationId ?? '' },
    { onData },
    Boolean(conversationId),
  );

  // 🔌 Short Circuit

  const messages = React.useMemo(
    () => toThreadMessages(seedMessages, state.bodies),
    [seedMessages, state.bodies],
  );

  return { isStreaming: state.isStreaming, messages };
}
