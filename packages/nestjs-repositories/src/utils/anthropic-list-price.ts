/**
 * @description Estimated list-price cost of one Anthropic API request, from the
 * raw `usage` object Claude Code writes to its transcript. Transcripts carry no
 * cost, so hook-ingested token rows are priced here at ingest.
 *
 * Source: Anthropic's published model pricing, read 2026-10-29 from
 * https://platform.claude.com/docs/en/about-claude/pricing (USD per million
 * tokens). The result is an ESTIMATE at list price: subscription plans do not
 * pay per token, and server-tool fees (web search, web fetch) are not included.
 *
 * Anything this cannot price exactly is null, never 0: a model not in the
 * table, a non-standard speed or service tier, an unrecognized inference
 * geography, missing token counts, or cache writes without their 5m/1h split.
 * Only models whose exact id has been confirmed are listed; add a model by its
 * id as it appears in `message.model`, never by its marketing name.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

/** USD per million tokens for each billed token category. */
interface TokenPrices {
  readonly cacheRead: number;
  readonly cacheWrite1h: number;
  readonly cacheWrite5m: number;
  readonly input: number;
  readonly output: number;
}

interface FlatModelPricing {
  readonly kind: 'flat';
  readonly prices: TokenPrices;
}

/**
 * Priced by prompt length: a request whose prompt (input + cache reads + cache
 * writes) is OVER `thresholdTokens` pays `above` for every token.
 */
interface TieredModelPricing {
  readonly above: TokenPrices;
  readonly kind: 'tiered';
  readonly thresholdTokens: number;
  readonly upTo: TokenPrices;
}

type ModelPricing = FlatModelPricing | TieredModelPricing;

const flat = (prices: TokenPrices): FlatModelPricing => ({
  kind: 'flat',
  prices,
});

/** A Map, not an object, so a model id like `constructor` can never match. */
const ANTHROPIC_LIST_PRICES: ReadonlyMap<string, ModelPricing> = new Map<
  string,
  ModelPricing
>([
  [
    'claude-fable-5-1',
    flat({
      cacheRead: 0.25,
      cacheWrite1h: 20,
      cacheWrite5m: 12.5,
      input: 10,
      output: 50,
    }),
  ],
  [
    'claude-haiku-5-5',
    {
      above: {
        cacheRead: 0.05,
        cacheWrite1h: 1,
        cacheWrite5m: 0.625,
        input: 0.5,
        output: 2.5,
      },
      kind: 'tiered',
      thresholdTokens: 100_000,
      upTo: {
        cacheRead: 0.01,
        cacheWrite1h: 0.2,
        cacheWrite5m: 0.125,
        input: 0.1,
        output: 0.5,
      },
    },
  ],
  [
    'claude-opus-5',
    flat({
      cacheRead: 0.5,
      cacheWrite1h: 10,
      cacheWrite5m: 6.25,
      input: 5,
      output: 25,
    }),
  ],
  [
    'claude-opus-5-5',
    flat({
      cacheRead: 0.2,
      cacheWrite1h: 8,
      cacheWrite5m: 5,
      input: 4,
      output: 20,
    }),
  ],
  [
    'claude-sonnet-5',
    flat({
      cacheRead: 0.2,
      cacheWrite1h: 4,
      cacheWrite5m: 2.5,
      input: 2,
      output: 10,
    }),
  ],
  [
    'claude-sonnet-5-5',
    flat({
      cacheRead: 0.1,
      cacheWrite1h: 4,
      cacheWrite5m: 2.5,
      input: 2,
      output: 10,
    }),
  ],
]);

/** Providers whose rows are Anthropic API requests billed at these prices. */
const PRICED_PROVIDERS: readonly string[] = ['anthropic', 'claude'];

/** `inference_geo` values billed at standard (global) prices. */
const STANDARD_GEOGRAPHIES: readonly string[] = ['global', 'not_available'];

/** US-only inference is billed at 1.1x every token category. */
const US_GEOGRAPHY = 'us';
const US_GEOGRAPHY_MULTIPLIER = 1.1;

const STANDARD = 'standard';
const TOKENS_PER_MILLION = 1_000_000;

/** Trims float noise (0.30000000000000004) without losing sub-cent precision. */
const COST_DECIMALS = 1e10;

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Absent or `standard` passes; any other value is a pricing mode we do not model. */
const isStandardOrAbsent = (value: unknown): boolean =>
  value === undefined || value === null || value === STANDARD;

const geographyMultiplier = (value: unknown): number | null => {
  if (value === undefined || value === null) {
    return 1;
  }
  if (value === US_GEOGRAPHY) {
    return US_GEOGRAPHY_MULTIPLIER;
  }
  return typeof value === 'string' && STANDARD_GEOGRAPHIES.includes(value)
    ? 1
    : null;
};

/** Cache writes split into 5m / 1h, or null when the split is missing or does not add up. */
const cacheWriteSplit = (
  usage: Record<string, unknown>,
): { readonly fiveMinute: number; readonly oneHour: number } | null => {
  const total = usage.cache_creation_input_tokens ?? 0;
  if (!isCount(total)) {
    return null;
  }

  const split = usage.cache_creation;
  if (!isRecord(split)) {
    return total === 0 ? { fiveMinute: 0, oneHour: 0 } : null;
  }

  const fiveMinute = split.ephemeral_5m_input_tokens ?? 0;
  const oneHour = split.ephemeral_1h_input_tokens ?? 0;
  if (!isCount(fiveMinute) || !isCount(oneHour)) {
    return null;
  }

  return fiveMinute + oneHour === total ? { fiveMinute, oneHour } : null;
};

/**
 * Estimated list-price USD for one request, or null when it cannot be priced
 * exactly. See the file header for the source and every null case.
 */
export const estimateAnthropicListPriceUsd = (row: {
  readonly model: string | null;
  readonly provider: string;
  readonly rawUsage: Record<string, unknown> | null;
}): number | null => {
  const { model, provider, rawUsage: usage } = row;
  if (!PRICED_PROVIDERS.includes(provider) || model === null || !usage) {
    return null;
  }

  const pricing = ANTHROPIC_LIST_PRICES.get(model);
  if (pricing === undefined) {
    return null;
  }
  if (
    !isStandardOrAbsent(usage.speed) ||
    !isStandardOrAbsent(usage.service_tier)
  ) {
    return null;
  }

  const multiplier = geographyMultiplier(usage.inference_geo);
  const input = usage.input_tokens;
  const output = usage.output_tokens;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const writes = cacheWriteSplit(usage);
  if (
    multiplier === null ||
    !isCount(input) ||
    !isCount(output) ||
    !isCount(cacheRead) ||
    writes === null
  ) {
    return null;
  }

  const promptTokens = input + cacheRead + writes.fiveMinute + writes.oneHour;
  const prices =
    pricing.kind === 'flat'
      ? pricing.prices
      : promptTokens > pricing.thresholdTokens
        ? pricing.above
        : pricing.upTo;

  const usd =
    ((input * prices.input +
      output * prices.output +
      cacheRead * prices.cacheRead +
      writes.fiveMinute * prices.cacheWrite5m +
      writes.oneHour * prices.cacheWrite1h) *
      multiplier) /
    TOKENS_PER_MILLION;

  return Math.round(usd * COST_DECIMALS) / COST_DECIMALS;
};
