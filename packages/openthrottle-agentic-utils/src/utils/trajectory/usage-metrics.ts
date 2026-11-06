/**
 * @description Normalizes each CLI's token accounting onto ATIF's, where `prompt_tokens` INCLUDES
 * the cached tokens. CLIs disagree on that: Anthropic-style accounting (claude, cursor, opencode)
 * reports cache reads and writes ALONGSIDE `input`, so they are added back; OpenAI-style accounting
 * (codex) reports cached tokens as a SUBSET of `input`. gemini, antigravity and grok are read as
 * inclusive — their streams carry no separate cache-write count to add. The raw usage object is
 * always kept in `extra.raw_usage`, so a wrong assumption here is recoverable from the stored data.
 */

import { isRecord } from '@openthrottle/nodejs-utils';
import { DRIVERS } from '@openthrottle/openthrottle-drivers';

import type { ConversationStreamChunk } from '../conversation-backend/types.ts';

/**
 * @description One usage chunk's tokens and cost, normalized.
 * @public
 */
export interface NormalizedUsage {
  readonly cachedTokens: number;
  readonly completionTokens: number;
  readonly costUsd: number | undefined;
  readonly promptTokens: number;
  readonly raw: unknown;
}

const EXCLUSIVE_CACHE_DRIVERS: ReadonlySet<string> = new Set([
  DRIVERS.claude,
  DRIVERS.cursor,
  DRIVERS.opencode,
]);

const numberAt = (
  record: Readonly<Record<string, unknown>>,
  keys: readonly string[],
): number => {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return 0;
};

/** opencode nests cache counts: `tokens.cache.{read,write}`; flatten them for the shared lookup. */
const flattenUsage = (usage: unknown): Readonly<Record<string, unknown>> => {
  if (!isRecord(usage)) {
    return {};
  }

  const cache = isRecord(usage.cache) ? usage.cache : {};

  return { ...usage, cacheRead: cache.read, cacheWrite: cache.write };
};

const costOf = (
  metadata: Readonly<Record<string, unknown>>,
): number | undefined => {
  const cost = metadata.totalCostUsd ?? metadata.cost;

  return typeof cost === 'number' && Number.isFinite(cost) ? cost : undefined;
};

/**
 * @description The normalized tokens and cost of a `usage` chunk, or `undefined` for any other
 * chunk or one that carried no usage.
 * @public
 */
export const normalizeUsage = (
  driverId: string,
  chunk: ConversationStreamChunk,
): NormalizedUsage | undefined => {
  const metadata = chunk.metadata ?? {};
  const raw = metadata.usage ?? metadata.tokens;

  if (!isRecord(raw)) {
    return undefined;
  }

  const usage = flattenUsage(raw);
  const input = numberAt(usage, ['input_tokens', 'inputTokens', 'input']);
  const output = numberAt(usage, ['output_tokens', 'outputTokens', 'output']);
  const cacheRead = numberAt(usage, [
    'cache_read_input_tokens',
    'cached_input_tokens',
    'cache_read_tokens',
    'cacheReadTokens',
    'cacheRead',
  ]);
  const cacheWrite = numberAt(usage, [
    'cache_creation_input_tokens',
    'cacheWriteTokens',
    'cacheWrite',
  ]);
  const isExclusive = EXCLUSIVE_CACHE_DRIVERS.has(driverId);

  return {
    cachedTokens: cacheRead,
    completionTokens: output,
    costUsd: costOf(metadata),
    promptTokens: isExclusive ? input + cacheRead + cacheWrite : input,
    raw,
  };
};
