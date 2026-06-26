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
import * as React from 'react';
import type {
  ChatMessage,
  ChatTurnEvent,
} from '@openthrottle/react-router-chat';
import {
  appendTurnTextEvent,
  applyTurnToolCall,
  applyTurnToolResult,
  failRunningTurnTools,
  parseChunkMetadata,
  toolLabelFromMetadataJson,
} from '@openthrottle/react-router-chat';
import { useSubscription } from '@openthrottle/react-router-graphql';
import type { ConversationStreamChunkAddedSubscription } from '~/__generated__/graphql';
import { ConversationStreamChunkAddedDocument } from '~/__generated__/graphql';
import { getGraphqlWsClient } from '~/services/graphql-ws-client';

type StreamChunk =
  ConversationStreamChunkAddedSubscription['conversationStreamChunkAdded'];

export interface StreamState {
  /** Accumulated assistant body keyed by messageId (flat markdown fallback). */
  readonly bodies: ReadonlyMap<string, string>;
  /** Structured, ordered turn events keyed by messageId. */
  readonly events: ReadonlyMap<string, readonly ChatTurnEvent[]>;
  /** True while a stream is in flight (between the first delta and `done`). */
  readonly isStreaming: boolean;
  /** Seen `messageId:sortOrder` keys for dedupe. */
  readonly seen: ReadonlySet<string>;
}

export const INITIAL_STREAM_STATE: StreamState = {
  bodies: new Map(),
  events: new Map(),
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
  const events = new Map(state.events);
  const current = bodies.get(chunk.messageId) ?? '';
  const currentEvents = events.get(chunk.messageId) ?? [];

  if (chunk.done) {
    if (chunk.error) {
      bodies.set(chunk.messageId, `${current}\n\n_Error: ${chunk.error}_`);
    }

    // The terminal chunk carries usage/result metadata; record it as a usage
    // event and resolve any tool still mid-flight to failed when the turn errored.
    const meta = parseChunkMetadata(chunk.metadataJson);
    const withUsage: readonly ChatTurnEvent[] = [
      ...currentEvents,
      {
        error: chunk.error ?? null,
        kind: 'usage',
        result: meta.usageResult,
        sortOrder: chunk.sortOrder,
        usageJson: meta.usageJson,
      },
    ];
    events.set(
      chunk.messageId,
      chunk.error ? failRunningTurnTools(withUsage, chunk.error) : withUsage,
    );

    return { bodies, events, isStreaming: false, seen };
  }

  // Assistant text accumulates into the flat body; tool calls show a dim
  // one-line marker in arrival order (unchanged back-compat rendering). In
  // parallel, every non-terminal kind folds into the structured `events` list.
  if (chunk.kind === 'text') {
    bodies.set(chunk.messageId, current + chunk.delta);
    events.set(
      chunk.messageId,
      appendTurnTextEvent(currentEvents, 'text', chunk.delta, chunk.sortOrder),
    );
  } else if (chunk.kind === 'thinking') {
    events.set(
      chunk.messageId,
      appendTurnTextEvent(
        currentEvents,
        'thinking',
        chunk.delta,
        chunk.sortOrder,
      ),
    );
  } else if (chunk.kind === 'tool_call') {
    bodies.set(
      chunk.messageId,
      `${current}\n\n_🔧 ${toolLabelFromMetadataJson(chunk.metadataJson)}_`,
    );
    events.set(
      chunk.messageId,
      applyTurnToolCall(
        currentEvents,
        parseChunkMetadata(chunk.metadataJson),
        chunk.sortOrder,
      ),
    );
  } else if (chunk.kind === 'tool_result') {
    events.set(
      chunk.messageId,
      applyTurnToolResult(
        currentEvents,
        parseChunkMetadata(chunk.metadataJson),
        chunk.sortOrder,
      ),
    );
  } else if (chunk.kind === 'session') {
    events.set(chunk.messageId, [
      ...currentEvents,
      {
        kind: 'session',
        sessionId: parseChunkMetadata(chunk.metadataJson).sessionId,
        sortOrder: chunk.sortOrder,
      },
    ]);
  }

  return { bodies, events, isStreaming: true, seen };
}

/**
 * Merge loader history with accumulated streamed assistant messages (seed wins by id).
 */
export function toThreadMessages(
  seedMessages: readonly ChatMessage[],
  bodies: ReadonlyMap<string, string>,
  events: ReadonlyMap<string, readonly ChatTurnEvent[]> = new Map(),
): ChatMessage[] {
  const seedIds = new Set(seedMessages.map((message) => message.id));
  const streamed: ChatMessage[] = Array.from(bodies.entries())
    .filter(([messageId]) => !seedIds.has(messageId))
    .map(([messageId, body]) => {
      const turnEvents = events.get(messageId);

      return turnEvents !== undefined && turnEvents.length > 0
        ? { body, events: turnEvents, id: messageId, role: 'assistant' }
        : { body, id: messageId, role: 'assistant' };
    });

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
    setState(INITIAL_STREAM_STATE);

    // 🪝 New conversation → drop any prior accumulation.
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
    () => toThreadMessages(seedMessages, state.bodies, state.events),
    [seedMessages, state.bodies, state.events],
  );

  return {
    isStreaming: state.isStreaming,
    messages,
  };
}
