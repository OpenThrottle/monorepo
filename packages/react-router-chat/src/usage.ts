/**
 * Pure, framework-free normalization of the heterogeneous token-accounting
 * metadata each conversation backend emits into the single {@link ChatTokenUsage}
 * shape the UI renders. Token accounting is best-effort: no backend reports the
 * same fields, so every extractor tolerates missing/partial/garbage input and
 * returns an object with only the fields it could resolve — never throwing,
 * never inventing zeros.
 *
 * Known backend shapes (see `openthrottle-agentic-utils` backend `events.ts`):
 * - claude: `{ usage: { input_tokens, output_tokens, cache_read_input_tokens,
 *   cache_creation_input_tokens }, modelUsage, totalCostUsd }` (snake_case)
 * - cursor-agent: `{ usage: { inputTokens, outputTokens, ... } }` (camelCase)
 * - opencode: `{ tokens: { total, input, output, reasoning, cache: { read, write } }, cost }`
 * - openai / others: OpenAI-style `{ prompt_tokens, completion_tokens, total_tokens }` or absent
 */

import type { ChatTokenUsage } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const asNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** First finite number among the candidates, else undefined. */
const firstNumber = (...candidates: readonly unknown[]): number | undefined => {
  for (const candidate of candidates) {
    const parsed = asFiniteNumber(candidate);
    if (parsed !== undefined) {
      return parsed;
    }
  }

  return undefined;
};

const safeParseRecord = (json: string): Record<string, unknown> | null => {
  if (json === '') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(json);

    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Normalize a backend's usage metadata into a typed {@link ChatTokenUsage}.
 * Accepts either the parsed metadata record or its JSON string; anything else
 * (null, array, unparseable, primitive) yields an empty `{}`.
 *
 * @public
 */
export const normalizeUsage = (input: unknown): ChatTokenUsage => {
  const meta =
    typeof input === 'string'
      ? safeParseRecord(input)
      : isRecord(input)
        ? input
        : null;

  if (meta === null) {
    return {};
  }

  const usage = isRecord(meta.usage) ? meta.usage : {};
  const tokens = isRecord(meta.tokens) ? meta.tokens : {};
  const cache = isRecord(tokens.cache) ? tokens.cache : {};

  const inputTokens = firstNumber(
    usage.input_tokens,
    usage.inputTokens,
    usage.prompt_tokens,
    usage.promptTokens,
    tokens.input,
    meta.input_tokens,
    meta.inputTokens,
  );
  const outputTokens = firstNumber(
    usage.output_tokens,
    usage.outputTokens,
    usage.completion_tokens,
    usage.completionTokens,
    tokens.output,
    meta.output_tokens,
    meta.outputTokens,
  );
  const cacheReadTokens = firstNumber(
    usage.cache_read_input_tokens,
    usage.cacheReadInputTokens,
    usage.cacheReadTokens,
    cache.read,
  );
  const cacheWriteTokens = firstNumber(
    usage.cache_creation_input_tokens,
    usage.cacheCreationInputTokens,
    usage.cacheWriteTokens,
    cache.write,
  );
  const explicitTotal = firstNumber(
    usage.total_tokens,
    usage.totalTokens,
    tokens.total,
    meta.total_tokens,
    meta.totalTokens,
  );
  const costUsd = firstNumber(
    meta.totalCostUsd,
    meta.total_cost_usd,
    meta.cost,
    usage.costUsd,
    usage.costUSD,
    usage.cost,
  );
  const model =
    asNonEmptyString(meta.model) ??
    asNonEmptyString(usage.model) ??
    (isRecord(meta.modelUsage) ? Object.keys(meta.modelUsage)[0] : undefined);

  const summable = [inputTokens, outputTokens].filter(
    (value): value is number => value !== undefined,
  );
  const totalTokens =
    explicitTotal ??
    (summable.length > 0 ? summable.reduce((a, b) => a + b, 0) : undefined);

  return {
    ...(cacheReadTokens !== undefined ? { cacheReadTokens } : {}),
    ...(cacheWriteTokens !== undefined ? { cacheWriteTokens } : {}),
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
  };
};

/** True when the usage carries no reported numbers (all token/cost fields absent). */
const hasNoCounts = (usage: ChatTokenUsage): boolean =>
  usage.inputTokens === undefined &&
  usage.outputTokens === undefined &&
  usage.cacheReadTokens === undefined &&
  usage.cacheWriteTokens === undefined &&
  usage.totalTokens === undefined &&
  usage.costUsd === undefined;

/**
 * True when a {@link ChatTokenUsage} has at least one reported numeric count.
 * Renderers use this to decide whether to show anything at all.
 *
 * @public
 */
export const hasUsageCounts = (usage: ChatTokenUsage | undefined): boolean =>
  usage !== undefined && !hasNoCounts(usage);

const addOptional = (
  a: number | undefined,
  b: number | undefined,
): number | undefined => {
  if (a === undefined && b === undefined) {
    return undefined;
  }

  return (a ?? 0) + (b ?? 0);
};

/**
 * Accumulate two usages into a running total. Token counts and cost add; the
 * model is the most recent non-empty one (b wins). Absent-on-both fields stay
 * absent so the result degrades as gracefully as its inputs.
 *
 * @public
 */
export const sumUsage = (
  a: ChatTokenUsage,
  b: ChatTokenUsage,
): ChatTokenUsage => {
  const cacheReadTokens = addOptional(a.cacheReadTokens, b.cacheReadTokens);
  const cacheWriteTokens = addOptional(a.cacheWriteTokens, b.cacheWriteTokens);
  const costUsd = addOptional(a.costUsd, b.costUsd);
  const inputTokens = addOptional(a.inputTokens, b.inputTokens);
  const outputTokens = addOptional(a.outputTokens, b.outputTokens);
  const totalTokens = addOptional(a.totalTokens, b.totalTokens);
  const model = b.model ?? a.model;

  return {
    ...(cacheReadTokens !== undefined ? { cacheReadTokens } : {}),
    ...(cacheWriteTokens !== undefined ? { cacheWriteTokens } : {}),
    ...(costUsd !== undefined ? { costUsd } : {}),
    ...(inputTokens !== undefined ? { inputTokens } : {}),
    ...(model !== undefined ? { model } : {}),
    ...(outputTokens !== undefined ? { outputTokens } : {}),
    ...(totalTokens !== undefined ? { totalTokens } : {}),
  };
};

const trimTrailingZero = (value: number): string => {
  const fixed = value.toFixed(1);

  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
};

/**
 * Compact human token count: `1234` → `1.2k`, `12000` → `12k`, `1_500_000` →
 * `1.5M`, `< 1000` rounded to an integer. Non-finite input renders `0`.
 *
 * @public
 */
export const formatTokenCount = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const magnitude = Math.abs(value);

  if (magnitude < 1000) {
    return String(Math.round(value));
  }

  if (magnitude < 1_000_000) {
    return `${trimTrailingZero(value / 1000)}k`;
  }

  return `${trimTrailingZero(value / 1_000_000)}M`;
};

/**
 * Format a dollar cost for display: `< $1` keeps 3 decimals (`$0.042`), larger
 * amounts 2 (`$1.20`). Returns `undefined` for absent/non-finite input so
 * callers can omit the cost entirely.
 *
 * @public
 */
export const formatUsageCost = (
  costUsd: number | undefined,
): string | undefined => {
  if (costUsd === undefined || !Number.isFinite(costUsd)) {
    return undefined;
  }

  return `$${costUsd.toFixed(Math.abs(costUsd) < 1 ? 3 : 2)}`;
};
