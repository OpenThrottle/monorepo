/**
 * @description One uniform reader over the chat path's per-CLI event mappers, so a plan run's
 * structured stdout is parsed by exactly the code the chat composer already trusts. Three of the
 * mappers are stateless functions and three are factories holding per-stream state (tool names,
 * emitted lengths), so a reader is created per run and must never be shared between runs.
 */

import { isRecord } from '@openthrottle/nodejs-utils';
import { DRIVERS } from '@openthrottle/openthrottle-drivers';

import { createAntigravityEventMapper } from '../conversation-backend/antigravity/events.ts';
import { mapClaudeEvent } from '../conversation-backend/claude/events.ts';
import { mapCodexEvent } from '../conversation-backend/codex/events.ts';
import { mapCursorEvent } from '../conversation-backend/cursor-agent/events.ts';
import { createGeminiEventMapper } from '../conversation-backend/gemini/events.ts';
import { mapGrokEvent } from '../conversation-backend/grok/events.ts';
import { createOpencodeEventMapper } from '../conversation-backend/opencode/events.ts';
import type { ConversationStreamChunk } from '../conversation-backend/types.ts';
import { CONVERSATION_STREAM_CHUNK_KINDS } from '../conversation-backend/types.ts';

/**
 * @description Maps one parsed stdout event onto zero or more chunks, holding whatever per-stream
 * state its CLI's mapper needs.
 * @public
 */
export type StructuredChunkReader = (
  event: unknown,
) => readonly ConversationStreamChunk[];

const listOf = (
  chunk: ConversationStreamChunk | null,
): readonly ConversationStreamChunk[] => {
  return chunk === null ? [] : [chunk];
};

const textChunk = (delta: string): ConversationStreamChunk => {
  return { delta, done: false, kind: CONVERSATION_STREAM_CHUNK_KINDS.text };
};

/** The text blocks of a consolidated `assistant` event (claude and cursor share the shape). */
const consolidatedText = (
  event: unknown,
): readonly ConversationStreamChunk[] => {
  if (!isRecord(event) || event.type !== 'assistant') {
    return [];
  }

  const message = isRecord(event.message) ? event.message : undefined;
  const content = Array.isArray(message?.content) ? message.content : [];

  return content.flatMap((block: unknown) => {
    const isText = isRecord(block) && block.type === 'text';
    const text = isText ? block.text : undefined;

    return typeof text === 'string' && text !== '' ? [textChunk(text)] : [];
  });
};

/**
 * Plan runs never ask claude or cursor for partial messages, so the consolidated `assistant` event
 * is the ONLY place their text appears. The chat mappers skip it deliberately (in chat it repeats
 * the partial deltas already shown), so the plan-run reader adds it back. Cursor's partial events
 * carry `timestamp_ms` and are already mapped; only the consolidated one is added.
 */
const withConsolidatedText = (
  map: (event: unknown) => readonly ConversationStreamChunk[],
): StructuredChunkReader => {
  return (event) => {
    const isPartial = isRecord(event) && event.timestamp_ms !== undefined;
    const text = isPartial ? [] : consolidatedText(event);

    return [...text, ...map(event)];
  };
};

/** opencode reports a failed turn as a top-level `{type:'error', error:{data:{message}}}` event. */
const opencodeErrorOf = (event: unknown): string | undefined => {
  if (!isRecord(event) || event.type !== 'error') {
    return undefined;
  }

  const error = isRecord(event.error) ? event.error : {};
  const data = isRecord(error.data) ? error.data : {};
  const message = data.message ?? error.message ?? error.name;

  return typeof message === 'string' ? message : 'opencode reported an error';
};

/**
 * @description A fresh reader for one run of `driverId`, or `undefined` for a driver with no
 * structured-output mapper (an unknown id). Never reuse a reader across runs.
 * @public
 */
export const createStructuredChunkReader = (
  driverId: string,
): StructuredChunkReader | undefined => {
  switch (driverId) {
    case DRIVERS.antigravity:
      return createAntigravityEventMapper();
    case DRIVERS.claude:
      return withConsolidatedText(mapClaudeEvent);
    case DRIVERS.codex:
      return (event) => {
        return listOf(mapCodexEvent(event));
      };
    case DRIVERS.cursor:
      return withConsolidatedText((event) => {
        return listOf(mapCursorEvent(event));
      });
    case DRIVERS.gemini:
      return createGeminiEventMapper();
    case DRIVERS.grok:
      return mapGrokEvent;
    case DRIVERS.opencode: {
      const mapper = createOpencodeEventMapper();

      return (event) => {
        const error = opencodeErrorOf(event);

        if (error === undefined) {
          return mapper.map(event);
        }

        return [
          {
            delta: '',
            done: true,
            error,
            kind: CONVERSATION_STREAM_CHUNK_KINDS.usage,
          },
        ];
      };
    }
    default:
      return undefined;
  }
};

/**
 * @description Parses one stdout line as a JSON object. Blank lines and non-JSON noise (plugin and
 * hook output, CLI banners) yield `undefined`, never an error.
 * @public
 */
export const parseStructuredLine = (
  line: string,
): Record<string, unknown> | undefined => {
  const trimmed = line.trim();

  if (!trimmed.startsWith('{')) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);

    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/**
 * @description Every chunk in one run's raw structured stdout, in order, read with a fresh reader.
 * Returns `[]` for an unknown driver or stdout with no JSON events. This is the input the run
 * transcript (ATIF) converter consumes.
 * @public
 */
export const readStructuredOutput = (
  driverId: string,
  rawStdout: string,
): readonly ConversationStreamChunk[] => {
  const reader = createStructuredChunkReader(driverId);

  if (reader === undefined) {
    return [];
  }

  return rawStdout.split('\n').flatMap((line) => {
    const event = parseStructuredLine(line);

    return event === undefined ? [] : reader(event);
  });
};
