import { isRecord } from '@openthrottle/nodejs-utils';
import type { ResolvedRunPhase } from './run-phase';
import { ChatRunPhase } from './types';
import type { ChatMessage, ChatTurnEvent } from './types';
import {
  appendTurnTextEvent,
  applyTurnToolCall,
  applyTurnToolResult,
  applyTurnUsage,
  failRunningTurnTools,
  isRetryableTerminalMetadata,
  parseChunkMetadata,
  toolLabelFromMetadataJson,
} from './turn-events';

/**
 * Server-reported phase carried on a live-only `keepalive` ping's `metadataJson`
 * (`{ model?, tool? }`). A named tool → running that tool; otherwise a model →
 * waiting for it. Returns null when the ping carries nothing usable, so the
 * client falls back to its elapsed-based guess.
 */
const serverPhaseFromKeepalive = (
  metadataJson: string | null | undefined,
): ResolvedRunPhase | null => {
  if (metadataJson === null || metadataJson === undefined) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(metadataJson);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) {
    return null;
  }

  const tool = typeof parsed.tool === 'string' ? parsed.tool.trim() : '';
  if (tool !== '') {
    return { detail: tool, phase: ChatRunPhase.runningTool };
  }

  const model = typeof parsed.model === 'string' ? parsed.model.trim() : '';
  if (model !== '') {
    return { detail: model, phase: ChatRunPhase.waiting };
  }

  return null;
};

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
  /**
   * Server-reported run phase keyed by messageId, folded from live-only
   * `keepalive` pings. Lets the running indicator name the model/tool during the
   * pre-content gap; absent when no ping has arrived (client falls back to its
   * elapsed-based guess).
   */
  readonly phaseByMessageId: ReadonlyMap<string, ResolvedRunPhase>;
  /**
   * messageIds whose terminal chunk carried the server's retryable timeout
   * marker (`TerminalTimeoutMetadata`) — the turn stalled and was safely
   * interrupted, so the client may auto-retry it (vs a fatal error, which is
   * `completedIds` without `retryableIds`).
   */
  readonly retryableIds: ReadonlySet<string>;
  /** Seen `messageId:sortOrder` keys for dedupe. */
  readonly seen: ReadonlySet<string>;
}

/** @public */
export const INITIAL_STREAM_STATE: StreamState = {
  bodies: new Map(),
  completedIds: new Set(),
  events: new Map(),
  isStreaming: false,
  phaseByMessageId: new Map(),
  retryableIds: new Set(),
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
  // A `keepalive` is a live-only liveness/phase ping: it carries no transcript
  // content and no stable sortOrder, so handle it before dedupe — record the
  // server-reported phase (if any) and return without touching `seen`, bodies,
  // or events, so it can never block a real chunk that reuses its sortOrder.
  if (chunk.kind === 'keepalive') {
    const phase = serverPhaseFromKeepalive(chunk.metadataJson);
    if (phase === null) {
      return state.isStreaming ? state : { ...state, isStreaming: true };
    }

    const phaseByMessageId = new Map(state.phaseByMessageId);
    phaseByMessageId.set(chunk.messageId, phase);

    return { ...state, isStreaming: true, phaseByMessageId };
  }

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

    // The terminal chunk may still carry usage/result metadata (openai/legacy
    // backends); fold it into the turn's single usage event — merging with any
    // usage chunk already folded mid-stream (opencode) or forwarded by the
    // server (claude/cursor) — and resolve any tool still mid-flight to failed
    // when the turn errored.
    const withUsage = applyTurnUsage(
      currentEvents,
      chunk.metadataJson ?? null,
      chunk.sortOrder,
      {
        error: chunk.error ?? null,
      },
    );
    events.set(
      chunk.messageId,
      chunk.error ? failRunningTurnTools(withUsage, chunk.error) : withUsage,
    );

    const completedIds = new Set(state.completedIds);
    completedIds.add(chunk.messageId);

    // A retryable timeout terminal is recorded so the client can auto-retry it;
    // a success or fatal error terminal completes without the marker.
    const retryableIds = new Set(state.retryableIds);
    if (isRetryableTerminalMetadata(chunk.metadataJson ?? null)) {
      retryableIds.add(chunk.messageId);
    }

    return {
      bodies,
      completedIds,
      events,
      isStreaming: false,
      phaseByMessageId: state.phaseByMessageId,
      retryableIds,
      seen,
    };
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
  } else if (chunk.kind === 'usage') {
    // Mid-stream usage: opencode emits per-step `usage` chunks, and the server
    // forwards claude/cursor terminal usage as a discrete `usage` chunk. Fold
    // into the turn's single (accumulating) usage event.
    events.set(
      chunk.messageId,
      applyTurnUsage(
        currentEvents,
        chunk.metadataJson ?? null,
        chunk.sortOrder,
      ),
    );
  }

  return {
    bodies,
    completedIds: state.completedIds,
    events,
    isStreaming: true,
    phaseByMessageId: state.phaseByMessageId,
    retryableIds: state.retryableIds,
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
