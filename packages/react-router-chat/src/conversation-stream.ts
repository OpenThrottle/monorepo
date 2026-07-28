import type { ChatMessage, ChatTurnEvent } from './types';
import {
  appendTurnTextEvent,
  applyTurnToolCall,
  applyTurnToolResult,
  failRunningTurnTools,
  parseChunkMetadata,
  toolLabelFromMetadataJson,
} from './turn-events';

/**
 * The subset of a streamed conversation chunk the reducer reads. Kept as a
 * hand-written structural type (not a generated GraphQL type) so this pure
 * accumulation logic can live in the presentational package and be shared by
 * every consuming app; each app's generated
 * `conversationStreamChunkAdded` payload is structurally assignable to it.
 * @public
 */
export interface ChatStreamChunk {
  readonly delta: string;
  readonly done: boolean;
  readonly error?: string | null;
  /** `text` | `thinking` | `tool_call` | `tool_result` | `session` | terminal. */
  readonly kind: string;
  readonly messageId: string;
  readonly metadataJson?: string | null;
  readonly sortOrder: number;
}

/** Accumulated streaming state folded from {@link ChatStreamChunk}s. @public */
export interface StreamState {
  /** Accumulated assistant body keyed by messageId (flat markdown fallback). */
  readonly bodies: ReadonlyMap<string, string>;
  /** messageIds that have received their terminal `done` chunk. */
  readonly completedIds: ReadonlySet<string>;
  /** Structured, ordered turn events keyed by messageId. */
  readonly events: ReadonlyMap<string, readonly ChatTurnEvent[]>;
  /** True while a stream is in flight (between the first delta and `done`). */
  readonly isStreaming: boolean;
  /** Seen `messageId:sortOrder` keys for dedupe. */
  readonly seen: ReadonlySet<string>;
}

/** @public */
export const INITIAL_STREAM_STATE: StreamState = {
  bodies: new Map(),
  completedIds: new Set(),
  events: new Map(),
  isStreaming: false,
  seen: new Set(),
};

/**
 * Pure reducer: fold one streamed chunk into the accumulation state. Dedupes by
 * `messageId:sortOrder`; accumulates text into the flat body and every kind into
 * the structured `events` timeline; the terminal `done` chunk records usage,
 * fails any still-running tool on error, and flips `isStreaming` off.
 * @public
 */
export function reduceStreamChunk(
  state: StreamState,
  chunk: ChatStreamChunk,
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
    const meta = parseChunkMetadata(chunk.metadataJson ?? null);
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

    const completedIds = new Set(state.completedIds);
    completedIds.add(chunk.messageId);

    return { bodies, completedIds, events, isStreaming: false, seen };
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
      `${current}\n\n_🔧 ${toolLabelFromMetadataJson(chunk.metadataJson ?? null)}_`,
    );
    events.set(
      chunk.messageId,
      applyTurnToolCall(
        currentEvents,
        parseChunkMetadata(chunk.metadataJson ?? null),
        chunk.sortOrder,
      ),
    );
  } else if (chunk.kind === 'tool_result') {
    events.set(
      chunk.messageId,
      applyTurnToolResult(
        currentEvents,
        parseChunkMetadata(chunk.metadataJson ?? null),
        chunk.sortOrder,
      ),
    );
  } else if (chunk.kind === 'session') {
    events.set(chunk.messageId, [
      ...currentEvents,
      {
        kind: 'session',
        sessionId: parseChunkMetadata(chunk.metadataJson ?? null).sessionId,
        sortOrder: chunk.sortOrder,
      },
    ]);
  }

  return {
    bodies,
    completedIds: state.completedIds,
    events,
    isStreaming: true,
    seen,
  };
}

/**
 * Merge loader history with accumulated streamed assistant messages (seed wins
 * by id, so a persisted assistant row replaces its in-flight stream once the
 * loader revalidates).
 * @public
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
