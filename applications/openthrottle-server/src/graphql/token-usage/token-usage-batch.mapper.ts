import { BadRequestException } from '@nestjs/common';
import type { TokenUsageBatchRow } from '@openthrottle/nestjs-repositories';

import type { RecordTokenUsageRowInput } from './token-usage.input.ts';

/** Largest batch one recordTokenUsage call accepts. */
export const MAX_TOKEN_USAGE_BATCH_SIZE = 500;

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Trimmed value, or null when absent/blank. */
const toOptionalTrimmed = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim() ?? '';

  return trimmed === '' ? null : trimmed;
};

const requireNonBlank = (
  index: number,
  label: string,
  value: string | null | undefined,
): string => {
  const trimmed = toOptionalTrimmed(value);
  if (trimmed == null) {
    throw new BadRequestException(`rows[${index}].${label} must not be blank`);
  }

  return trimmed;
};

const toTokenCount = (
  index: number,
  label: string,
  value: number | null | undefined,
): number | null => {
  if (value == null) {
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new BadRequestException(
      `rows[${index}].${label} must be a non-negative integer`,
    );
  }

  return value;
};

const toCostUsd = (
  index: number,
  value: number | null | undefined,
): number | null => {
  if (value == null) {
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new BadRequestException(
      `rows[${index}].costUsd must be a non-negative number`,
    );
  }

  return value;
};

const toOccurredAt = (index: number, value: string): Date => {
  const occurredAt = new Date(value);
  if (Number.isNaN(occurredAt.getTime())) {
    throw new BadRequestException(
      `rows[${index}].occurredAt must be a valid date`,
    );
  }

  return occurredAt;
};

const toRawUsage = (
  index: number,
  value: string | null | undefined,
): Record<string, unknown> | null => {
  if (value == null) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException(
      `rows[${index}].rawUsageJson is not valid JSON`,
    );
  }
  if (!isPlainRecord(parsed)) {
    throw new BadRequestException(
      `rows[${index}].rawUsageJson must be a JSON object`,
    );
  }

  return parsed;
};

const toBatchRow = (
  row: RecordTokenUsageRowInput,
  index: number,
): TokenUsageBatchRow => ({
  cachedReadTokens: toTokenCount(index, 'cacheReadTokens', row.cacheReadTokens),
  cachedWriteTokens: toTokenCount(
    index,
    'cacheWriteTokens',
    row.cacheWriteTokens,
  ),
  costUsd: toCostUsd(index, row.costUsd),
  cwd: row.cwd ?? null,
  gitBranch: row.gitBranch ?? null,
  inputTokens: toTokenCount(index, 'inputTokens', row.inputTokens),
  model: requireNonBlank(index, 'model', row.model),
  occurredAt: toOccurredAt(index, row.occurredAt),
  outputTokens: toTokenCount(index, 'outputTokens', row.outputTokens),
  provider: requireNonBlank(index, 'provider', row.provider),
  rawUsage: toRawUsage(index, row.rawUsageJson),
  reasoningTokens: toTokenCount(index, 'reasoningTokens', row.reasoningTokens),
  requestId: toOptionalTrimmed(row.requestId),
  sessionId: toOptionalTrimmed(row.sessionId),
  source: requireNonBlank(index, 'source', row.source),
  totalTokens: toTokenCount(index, 'totalTokens', row.totalTokens),
});

/**
 * Validate a recordTokenUsage batch and map it to repository rows. Any invalid
 * row (or an oversized batch) rejects the WHOLE batch with a BadRequestException
 * naming the row index, so the client can dead-letter the offending line.
 */
export const toTokenUsageBatchRows = (
  rows: readonly RecordTokenUsageRowInput[],
): TokenUsageBatchRow[] => {
  if (rows.length > MAX_TOKEN_USAGE_BATCH_SIZE) {
    throw new BadRequestException(
      `rows must contain at most ${MAX_TOKEN_USAGE_BATCH_SIZE} entries (got ${rows.length})`,
    );
  }

  return rows.map(toBatchRow);
};
