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
import { postGraphqlMutationNode } from './graphql.ts';

/**
 * The server accepts at most this many rows per call and rejects a larger
 * batch outright, so every sender chunks to it.
 *
 * @public
 */
export const MAX_TOKEN_USAGE_BATCH = 500;

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
 * Split records into server-sized batches.
 *
 * @public
 */
export const chunkTokenUsage = (
  records: readonly TokenUsageRecord[],
  size: number = MAX_TOKEN_USAGE_BATCH,
): TokenUsageRecord[][] => {
  const step = Math.max(1, Math.min(size, MAX_TOKEN_USAGE_BATCH));
  const out: TokenUsageRecord[][] = [];
  for (let start = 0; start < records.length; start += step) {
    out.push(records.slice(start, start + step));
  }
  return out;
};

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
