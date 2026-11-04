/**
 * Token-usage GraphQL mapping + the batch POST. Tool-neutral: an adapter hands
 * in `TokenUsageRecord`s, this module knows the `recordTokenUsage` wire shape
 * and nothing about where the records came from.
 */
import type {
  HookFetch,
  TokenUsageBatchResult,
  TokenUsageRecord,
} from '../types.ts';
import { chunkByBudget } from './chunk.ts';
import { postGraphqlMutationNode } from './graphql.ts';

/**
 * The server accepts at most this many rows per call and rejects a larger
 * batch outright, so every sender chunks to it.
 *
 * @public
 */
export const MAX_TOKEN_USAGE_BATCH = 500;

/**
 * Byte budget for one batch's serialized rows, so a batch stays under any
 * body limit in front of the server. A real transcript-derived row is ~1.2 KB, which
 * makes this ~50 rows. It sits well below Express's 100 KB json default (and a
 * proxy's 1 MB) on purpose: a 413 is permanent, so an oversized batch
 * dead-letters every row in it.
 *
 * @public
 */
export const MAX_TOKEN_USAGE_BATCH_BYTES = 64 * 1024;

/** @public */
export const RECORD_TOKEN_USAGE_MUTATION = `
mutation RecordTokenUsage($input: RecordTokenUsageInput!) {
  recordTokenUsage(input: $input) {
    inserted
    skipped
  }
}
`;

/**
 * Map one buffered snake_case record to the camelCase GraphQL row.
 *
 * @public
 */
export const toRecordTokenUsageRow = (
  record: TokenUsageRecord,
): Record<string, number | string | null> => ({
  cacheReadTokens: record.cache_read_tokens,
  cacheWriteTokens: record.cache_write_tokens,
  costUsd: record.cost_usd,
  cwd: record.cwd,
  gitBranch: record.git_branch,
  inputTokens: record.input_tokens,
  model: record.model,
  occurredAt: record.occurred_at,
  outputTokens: record.output_tokens,
  provider: record.provider,
  rawUsageJson: record.raw_usage_json,
  reasoningTokens: record.reasoning_tokens,
  requestId: record.request_id,
  sessionId: record.session_id,
  source: record.source,
  totalTokens: record.total_tokens,
});

/**
 * Wire size of one record, as `postTokenUsageBatch` serializes it.
 *
 * @public
 */
export const tokenUsageRowBytes = (record: TokenUsageRecord): number =>
  Buffer.byteLength(JSON.stringify(toRecordTokenUsageRow(record)), 'utf8');

/**
 * Split records into deliverable batches: at most `size` rows (never more than
 * the server's `MAX_TOKEN_USAGE_BATCH`) and at most `maxBytes` of rows.
 *
 * @public
 */
export const chunkTokenUsage = (
  records: readonly TokenUsageRecord[],
  size: number = MAX_TOKEN_USAGE_BATCH,
  maxBytes: number = MAX_TOKEN_USAGE_BATCH_BYTES,
): TokenUsageRecord[][] =>
  chunkByBudget(records, {
    maxBytes,
    maxItems: Math.min(size, MAX_TOKEN_USAGE_BATCH),
    sizeOf: tokenUsageRowBytes,
  });

/**
 * POST one batch (at most `MAX_TOKEN_USAGE_BATCH` rows) to recordTokenUsage.
 * Never throws. A whole batch succeeds or fails together — the server rejects
 * the batch if any row is invalid — so the caller classifies per batch.
 *
 * @public
 */
export const postTokenUsageBatch = async ({
  records,
  graphqlUrl,
  authToken = '',
  timeoutMs,
  fetchImpl = globalThis.fetch,
}: {
  authToken?: string;
  fetchImpl?: HookFetch;
  graphqlUrl: string | null;
  records: readonly TokenUsageRecord[];
  timeoutMs: number;
}): Promise<TokenUsageBatchResult> => {
  if (!records.length) {
    return { inserted: 0, ok: true, skipped: 0 };
  }
  if (records.length > MAX_TOKEN_USAGE_BATCH) {
    // Our own bug, not the server's: retrying can never fix it.
    return {
      ok: false,
      permanent: true,
      reason: `batch of ${records.length} exceeds ${MAX_TOKEN_USAGE_BATCH}`,
    };
  }

  const posted = await postGraphqlMutationNode({
    authToken,
    fetchImpl,
    field: 'recordTokenUsage',
    graphqlUrl,
    query: RECORD_TOKEN_USAGE_MUTATION,
    timeoutMs,
    variables: { input: { rows: records.map(toRecordTokenUsageRow) } },
  });
  if (!posted.ok) {
    return posted;
  }

  const { inserted, skipped } = posted.node;
  if (typeof inserted !== 'number' || typeof skipped !== 'number') {
    // Re-sending is safe (the server dedupes), so treat it as transient.
    return {
      ok: false,
      permanent: false,
      reason: 'malformed recordTokenUsage result',
    };
  }

  return { inserted, ok: true, skipped };
};
