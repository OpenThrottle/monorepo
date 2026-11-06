/**
 * @description Reads tool calls and results out of chunk metadata. The chat mappers shape metadata
 * for the composer's tool cards, and each CLI puts the same facts in a different place, so this is
 * the one table of where to look:
 *
 * | CLI         | arguments                          | result content                     |
 * | ----------- | ---------------------------------- | ---------------------------------- |
 * | claude      | `toolCall` (object, on the call)   | `toolCall` (string, on the result) |
 * | gemini, agy | `toolCall` (object, on the call)   | `toolCall.output`                  |
 * | cursor      | `toolCall.<name>ToolCall.args`     | `toolCall.<name>ToolCall.result`   |
 * | opencode    | `toolPart.state.input`             | `toolPart.state.output`            |
 * | codex       | `item` minus bookkeeping           | `item.aggregated_output`           |
 */

import { isRecord } from '@openthrottle/nodejs-utils';

import type { ConversationStreamChunk } from '../conversation-backend/types.ts';

type Metadata = Readonly<Record<string, unknown>>;

/** Keys on a codex `item` that describe the item rather than the call. */
const CODEX_ITEM_BOOKKEEPING = new Set([
  'aggregated_output',
  'exit_code',
  'id',
  'item_type',
  'status',
  'type',
]);

const metadataOf = (chunk: ConversationStreamChunk): Metadata => {
  return chunk.metadata ?? {};
};

const stringOf = (value: unknown): string | undefined => {
  return typeof value === 'string' && value !== '' ? value : undefined;
};

const asText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  return value === undefined || value === null ? '' : JSON.stringify(value);
};

/** Cursor names a tool with a KEY (`{ editToolCall: {…} }`); this returns that inner record. */
const cursorToolBody = (toolCall: unknown): Metadata | undefined => {
  if (!isRecord(toolCall)) {
    return undefined;
  }

  const key = Object.keys(toolCall).find((candidate) => {
    return candidate.endsWith('ToolCall') && isRecord(toolCall[candidate]);
  });
  const body = key === undefined ? undefined : toolCall[key];

  return isRecord(body) ? body : undefined;
};

const opencodeState = (metadata: Metadata): Metadata | undefined => {
  const part = isRecord(metadata.toolPart) ? metadata.toolPart : undefined;

  return isRecord(part?.state) ? part.state : undefined;
};

const codexItem = (metadata: Metadata): Metadata | undefined => {
  return isRecord(metadata.item) ? metadata.item : undefined;
};

/**
 * @description The id correlating a call with its result, when the CLI supplies one.
 * @public
 */
export const toolCallIdOf = (
  chunk: ConversationStreamChunk,
): string | undefined => {
  const metadata = metadataOf(chunk);

  return stringOf(metadata.callId) ?? stringOf(codexItem(metadata)?.id);
};

/**
 * @description The tool's name, falling back to `tool` when the CLI gave none.
 * @public
 */
export const toolNameOf = (chunk: ConversationStreamChunk): string => {
  const metadata = metadataOf(chunk);

  return (
    stringOf(metadata.toolName) ??
    stringOf(metadata.name) ??
    stringOf(metadata.itemType) ??
    'tool'
  );
};

/**
 * @description The call's arguments as a JSON object; ATIF requires an object, so a scalar is
 * wrapped as `{ value }` and a missing payload is `{}`.
 * @public
 */
export const toolArgumentsOf = (
  chunk: ConversationStreamChunk,
): Readonly<Record<string, unknown>> => {
  const metadata = metadataOf(chunk);
  const item = codexItem(metadata);

  if (item !== undefined) {
    return Object.fromEntries(
      Object.entries(item).filter(([key]) => {
        return !CODEX_ITEM_BOOKKEEPING.has(key);
      }),
    );
  }

  const state = opencodeState(metadata);
  const cursorBody = cursorToolBody(metadata.toolCall);
  const candidate = state?.input ?? cursorBody?.args ?? metadata.toolCall;

  if (isRecord(candidate)) {
    return candidate;
  }

  return candidate === undefined || candidate === null
    ? {}
    : { value: candidate };
};

/**
 * @description The result's content as text.
 * @public
 */
export const toolResultContentOf = (chunk: ConversationStreamChunk): string => {
  const metadata = metadataOf(chunk);
  const item = codexItem(metadata);

  if (item !== undefined) {
    return asText(item.aggregated_output);
  }

  const state = opencodeState(metadata);

  if (state !== undefined) {
    return asText(state.output ?? state.error);
  }

  const cursorBody = cursorToolBody(metadata.toolCall);

  if (cursorBody !== undefined) {
    return asText(cursorBody.result);
  }

  const toolCall = metadata.toolCall;

  if (isRecord(toolCall) && 'output' in toolCall) {
    return asText(toolCall.output ?? toolCall.error);
  }

  return asText(toolCall);
};

/**
 * @description True when the CLI reported the call as failed.
 * @public
 */
export const isToolResultError = (chunk: ConversationStreamChunk): boolean => {
  const metadata = metadataOf(chunk);
  const toolCall = isRecord(metadata.toolCall) ? metadata.toolCall : {};
  const hasChunkError = typeof chunk.error === 'string' && chunk.error !== '';
  const exitCode = codexItem(metadata)?.exit_code;

  return (
    hasChunkError ||
    metadata.isError === true ||
    (typeof toolCall.error === 'string' && toolCall.error !== '') ||
    (typeof exitCode === 'number' && exitCode !== 0)
  );
};
