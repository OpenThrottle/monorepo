/**
 * Claude Code transcript parsing — the Claude-specific half of per-request
 * token capture. Turns the complete lines of a session transcript into
 * tool-neutral `TokenUsageRecord`s, one per API request. Knows nothing about
 * files, offsets or the network; the reader that drives it is in
 * `transcript-usage.ts`.
 *
 * Shape facts (pinned by `__tests__/fixtures/`):
 *   - One API request is written as SEVERAL `assistant` lines (one per content
 *     block), all carrying the same `requestId` and the SAME `message.usage`.
 *     Counting lines instead of request ids would multiply the usage.
 *   - `user` lines and `<synthetic>` assistant lines (local errors, no
 *     `requestId`, all-zero usage) are not API requests.
 *   - Subagent transcripts use the same line shape with `isSidechain: true` and
 *     an `agentId`; their `sessionId` is the PARENT session's.
 */
import {
  hasUsageCounts,
  normalizeUsage,
} from '@openthrottle/agentic-token-usage';
import { isRecord } from '@openthrottle/nodejs-utils';

import type { TokenUsageRecord } from '../../types.ts';
import { CLAUDE_SOURCE } from './payload.ts';

/** Provider stamped onto every row: the model vendor, not the harness. @public */
export const CLAUDE_PROVIDER = 'claude';

const SYNTHETIC_MODEL = '<synthetic>';

const nonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;

const finiteNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * Claude reports thinking tokens as `output_tokens_details.thinking_tokens`,
 * which `normalizeUsage` does not read (it only knows `reasoning_tokens`).
 */
const thinkingTokens = (usage: Record<string, unknown>): number | null =>
  isRecord(usage.output_tokens_details)
    ? finiteNumber(usage.output_tokens_details.thinking_tokens)
    : null;

const parseJsonRecord = (line: string): Record<string, unknown> | null => {
  try {
    const parsed: unknown = JSON.parse(line);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Map one transcript line to a usage record, or null when it is not a billable
 * API request (wrong type, no `requestId`, no `message.usage`, synthetic, or no
 * counts at all).
 */
const toRecord = (
  entry: Record<string, unknown>,
  fallbackSessionId: string | null,
): TokenUsageRecord | null => {
  if (entry.type !== 'assistant') {
    return null;
  }
  const requestId = nonEmptyString(entry.requestId);
  const { message } = entry;
  if (requestId === null || !isRecord(message) || !isRecord(message.usage)) {
    return null;
  }
  const model = nonEmptyString(message.model);
  if (model === null || model === SYNTHETIC_MODEL) {
    return null;
  }

  const { usage } = message;
  const counts = normalizeUsage({ model, usage });
  if (!hasUsageCounts(counts)) {
    return null;
  }

  const agentId = nonEmptyString(entry.agentId);
  return {
    cache_read_tokens: counts.cacheReadTokens ?? null,
    cache_write_tokens: counts.cacheWriteTokens ?? null,
    cost_usd: counts.costUsd ?? null,
    cwd: nonEmptyString(entry.cwd),
    git_branch: nonEmptyString(entry.gitBranch),
    input_tokens: counts.inputTokens ?? null,
    model,
    occurred_at: nonEmptyString(entry.timestamp) ?? new Date().toISOString(),
    output_tokens: counts.outputTokens ?? null,
    provider: CLAUDE_PROVIDER,
    raw_usage_json: JSON.stringify(
      agentId === null ? usage : { ...usage, agentId, isSidechain: true },
    ),
    reasoning_tokens: counts.reasoningTokens ?? thinkingTokens(usage),
    request_id: requestId,
    session_id: nonEmptyString(entry.sessionId) ?? fallbackSessionId,
    source: CLAUDE_SOURCE,
    total_tokens: counts.totalTokens ?? null,
  };
};

/**
 * Fold complete transcript lines into one record per `requestId`.
 *
 * Malformed lines and lines that are not API requests are skipped silently.
 * `seen` carries the request ids already emitted: the first line of a request
 * wins (its siblings carry identical usage), and passing one set across several
 * files of the same Stop keeps a request id from being emitted twice.
 *
 * @public
 */
export const parseTranscriptLines = ({
  fallbackSessionId,
  lines,
  seen,
}: {
  fallbackSessionId: string | null;
  lines: readonly string[];
  seen: Set<string>;
}): TokenUsageRecord[] => {
  const records: TokenUsageRecord[] = [];
  for (const line of lines) {
    const entry = parseJsonRecord(line);
    if (entry === null) {
      continue;
    }
    const record = toRecord(entry, fallbackSessionId);
    if (record === null || record.request_id === null) {
      continue;
    }
    if (seen.has(record.request_id)) {
      continue;
    }
    seen.add(record.request_id);
    records.push(record);
  }
  return records;
};
