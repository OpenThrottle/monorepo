/**
 * Compare two `ConversationStreamChunk` streams of the same scenario, one from
 * a backend's per-CLI adapter and one from its ACP backend, by what matters
 * behaviourally: the order of chunk kinds (consecutive same-kind chunks
 * collapsed), tool call/result pairing, thinking before text, the terminal
 * chunk, and session, usage and permission chunks. Ids, text and timing are
 * dropped. Pure: no fixtures, no replays.
 */

import type { ConversationStreamChunk } from '@openthrottle/agentic-conversation-backend';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '@openthrottle/agentic-conversation-backend';

/**
 * How a turn ended.
 *
 * @public
 */
export const PARITY_TERMINALS = {
  cancelled: 'cancelled',
  done: 'done',
  error: 'error',
  none: 'none',
} as const;

export type ParityTerminalsKey = keyof typeof PARITY_TERMINALS;
/** @public */
export type ParityTerminalsValue =
  (typeof PARITY_TERMINALS)[ParityTerminalsKey];

/**
 * The behavioural shape of one turn's chunks.
 *
 * @public
 */
export interface ChunkShape {
  readonly hasSession: boolean;
  readonly hasText: boolean;
  readonly hasThinking: boolean;
  readonly hasUsage: boolean;
  readonly permissionChunks: number;
  /** Chunk kinds in order; keepalives and usage dropped, consecutive repeats collapsed. */
  readonly sequence: readonly string[];
  readonly terminal: ParityTerminalsValue;
  /** True when thinking precedes the first text, or either is absent. */
  readonly thinkingBeforeText: boolean;
  readonly toolCalls: number;
  readonly toolResults: number;
  /** Every result follows a call, and the counts match. */
  readonly toolsPaired: boolean;
}

/**
 * The facets {@link compareChunkShapes} reports a difference in.
 *
 * @public
 */
export const PARITY_FACETS = {
  permission: 'permission',
  sequence: 'sequence',
  session: 'session',
  terminal: 'terminal',
  thinking: 'thinking',
  tools: 'tools',
  usage: 'usage',
} as const;

export type ParityFacetsKey = keyof typeof PARITY_FACETS;
/** @public */
export type ParityFacetsValue = (typeof PARITY_FACETS)[ParityFacetsKey];

/** @public */
export interface ParityDifference {
  readonly acp: string;
  readonly cli: string;
  readonly facet: ParityFacetsValue;
}

const { keepalive, permissionRequest, session, text, thinking, toolCall } =
  CONVERSATION_STREAM_CHUNK_KINDS;

function terminalOf(
  chunks: readonly ConversationStreamChunk[],
): ParityTerminalsValue {
  // Not `findLast`: openthrottle-server type-checks this source with a lib
  // that predates ES2023.
  const last = chunks.filter((chunk) => chunk.done).at(-1);
  if (last === undefined) {
    return PARITY_TERMINALS.none;
  }
  if (last.error === 'cancelled') {
    return PARITY_TERMINALS.cancelled;
  }
  const hasError =
    last.error !== undefined && last.error !== null && last.error !== '';
  return hasError ? PARITY_TERMINALS.error : PARITY_TERMINALS.done;
}

/** True when every tool result follows an unmatched call, and none is left over. */
function arePaired(kinds: readonly string[]): boolean {
  let open = 0;
  for (const kind of kinds) {
    if (kind === toolCall) {
      open += 1;
    } else if (kind === CONVERSATION_STREAM_CHUNK_KINDS.toolResult) {
      if (open === 0) {
        return false;
      }
      open -= 1;
    }
  }
  return open === 0;
}

/**
 * Reduce one turn's chunks to their behavioural shape.
 *
 * @public
 */
export function chunkShape(
  chunks: readonly ConversationStreamChunk[],
): ChunkShape {
  const kinds = chunks
    .map((chunk) => chunk.kind)
    .filter((kind) => kind !== keepalive);
  // Usage has its own facet, so it stays out of the sequence.
  const ordered = kinds.filter(
    (kind) => kind !== CONVERSATION_STREAM_CHUNK_KINDS.usage,
  );
  const sequence = ordered.filter((kind, index) => kind !== ordered[index - 1]);
  const firstThinking = kinds.indexOf(thinking);
  const firstText = kinds.indexOf(text);
  const hasBoth = firstThinking !== -1 && firstText !== -1;

  return {
    hasSession: kinds.includes(session),
    hasText: firstText !== -1,
    hasThinking: firstThinking !== -1,
    hasUsage: chunks.some((chunk) => {
      return (
        chunk.kind === CONVERSATION_STREAM_CHUNK_KINDS.usage ||
        chunk.metadata?.usage !== undefined
      );
    }),
    permissionChunks: kinds.filter((kind) => kind === permissionRequest).length,
    sequence,
    terminal: terminalOf(chunks),
    thinkingBeforeText: !hasBoth || firstThinking < firstText,
    toolCalls: kinds.filter((kind) => kind === toolCall).length,
    toolResults: kinds.filter((kind) => {
      return kind === CONVERSATION_STREAM_CHUNK_KINDS.toolResult;
    }).length,
    toolsPaired: arePaired(kinds),
  };
}

function differs(
  facet: ParityFacetsValue,
  cli: string,
  acp: string,
): ParityDifference[] {
  return cli === acp ? [] : [{ acp, cli, facet }];
}

/**
 * Every behavioural difference between a CLI turn and an ACP turn of the same
 * scenario; empty means parity.
 *
 * @public
 */
export function compareChunkShapes(
  cli: ChunkShape,
  acp: ChunkShape,
): ParityDifference[] {
  const toolSummary = (shape: ChunkShape): string => {
    const paired = shape.toolsPaired ? 'paired' : 'unpaired';
    return `${shape.toolCalls} calls, ${shape.toolResults} results, ${paired}`;
  };
  const thinkingSummary = (shape: ChunkShape): string => {
    const order = shape.thinkingBeforeText ? 'before text' : 'after text';
    return shape.hasThinking ? `thinking ${order}` : 'no thinking';
  };
  const flag = (value: boolean): string => {
    return value ? 'yes' : 'no';
  };

  return [
    ...differs(PARITY_FACETS.terminal, cli.terminal, acp.terminal),
    ...differs(PARITY_FACETS.tools, toolSummary(cli), toolSummary(acp)),
    ...differs(
      PARITY_FACETS.thinking,
      thinkingSummary(cli),
      thinkingSummary(acp),
    ),
    ...differs(
      PARITY_FACETS.session,
      flag(cli.hasSession),
      flag(acp.hasSession),
    ),
    ...differs(PARITY_FACETS.usage, flag(cli.hasUsage), flag(acp.hasUsage)),
    ...differs(
      PARITY_FACETS.permission,
      String(cli.permissionChunks),
      String(acp.permissionChunks),
    ),
    ...differs(
      PARITY_FACETS.sequence,
      cli.sequence.join(' > '),
      acp.sequence.join(' > '),
    ),
  ];
}

/**
 * A reason a backend's CLI chat adapter cannot be retired yet.
 *
 * @public
 */
export interface RetirementBlocker {
  readonly reason: string;
  readonly ref: string;
}

/**
 * The per-backend retirement verdict.
 *
 * @public
 */
export type RetirementVerdict =
  | { readonly go: false; readonly reasons: readonly string[] }
  | { readonly go: true; readonly reasons: readonly never[] };

/**
 * GO only when no known blocker and no missing ACP capability remains.
 *
 * @public
 */
export function retirementVerdict(
  blockers: readonly RetirementBlocker[],
  missingCapabilities: readonly string[],
): RetirementVerdict {
  const reasons = [
    ...blockers.map((blocker) => `blocker ${blocker.ref}: ${blocker.reason}`),
    ...missingCapabilities.map(
      (capability) => `missing capability: ${capability}`,
    ),
  ];
  return reasons.length === 0
    ? { go: true, reasons: [] }
    : { go: false, reasons };
}
