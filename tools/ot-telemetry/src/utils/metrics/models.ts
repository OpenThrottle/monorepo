import type pg from 'pg';

import type {
  MetricContext,
  MetricQuery,
  ReportWindow,
} from '../../types/index.ts';

/**
 * @description Model token-usage metrics (`metrics.model_token_usage`, sourced
 * from `agent_token_usage`) plus two configuration-signal families —
 * favorited models (`metrics.favorite_models`, from `user_favorite_agent_models`)
 * and disabled agent CLIs (`metrics.disabled_agent_clis`, from
 * `user_disabled_agent_clis`) — registered as three separate {@link MetricQuery}s
 * so a database missing one preference table still gets the rest. Every query
 * here selects counts, labels, and sums only — `agent_token_usage.raw_usage` is
 * NEVER selected: it is an unbounded provider blob the README.md privacy
 * contract forbids. Every sum is cast to `::float8` so node-postgres returns a
 * JS number rather than the string it defaults to for `numeric`/`bigint`
 * columns (OIDs 1700/20 have no built-in parser; `float8` does).
 */

/** Token/cost totals for one `provider` bucket. */
export interface ProviderTokenUsageRow {
  readonly cachedReadTokens: number;
  readonly cachedWriteTokens: number;
  readonly costUsd: number;
  readonly inputTokens: number;
  readonly invocationCount: number;
  readonly outputTokens: number;
  readonly provider: string;
  readonly reasoningTokens: number;
  readonly totalTokens: number;
}

/** Same totals, one level finer: `(provider, model)`. */
export interface ModelTokenUsageRow extends ProviderTokenUsageRow {
  readonly model: string;
}

/** One UTC calendar day's token/cost totals. */
export interface DailyTokenUsageRow {
  readonly costUsd: number;
  readonly date: string;
  readonly totalTokens: number;
}

export interface ModelTokenUsageMetrics {
  readonly byModel: readonly ModelTokenUsageRow[];
  readonly byProvider: readonly ProviderTokenUsageRow[];
  /**
   * Share of total prompt input served from the prompt cache, over the whole
   * window: `cached_read_tokens / (cached_read_tokens + input_tokens)`.
   * `null` when the window reported no input at all.
   *
   * The denominator includes the cached reads deliberately. `input_tokens`
   * mirrors the provider's own field (see migration 083), which counts only
   * UNCACHED prompt tokens — cache reads are reported separately. Dividing by
   * `input_tokens` alone yields a cached-to-fresh multiple, not a ratio, and
   * goes above 1 on any cache-heavy workload: it read 4.48 on the authoring box.
   */
  readonly cacheHitRatio: number | null;
  readonly dailyUsage: readonly DailyTokenUsageRow[];
  readonly invocationCountInWindow: number;
}

const TOKEN_SUM_COLUMNS = `
  COALESCE(sum(input_tokens), 0)::float8 AS "inputTokens",
  COALESCE(sum(output_tokens), 0)::float8 AS "outputTokens",
  COALESCE(sum(cached_read_tokens), 0)::float8 AS "cachedReadTokens",
  COALESCE(sum(cached_write_tokens), 0)::float8 AS "cachedWriteTokens",
  COALESCE(sum(reasoning_tokens), 0)::float8 AS "reasoningTokens",
  COALESCE(sum(total_tokens), 0)::float8 AS "totalTokens",
  COALESCE(sum(cost_usd), 0)::float8 AS "costUsd"
`;

async function queryByProvider(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly ProviderTokenUsageRow[]> {
  const { rows } = await client.query<ProviderTokenUsageRow>(
    `SELECT provider, count(*)::int AS "invocationCount", ${TOKEN_SUM_COLUMNS}
     FROM agent_token_usage
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY provider
     ORDER BY "totalTokens" DESC, provider ASC`,
    [window.since, window.until],
  );
  return rows;
}

async function queryByModel(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly ModelTokenUsageRow[]> {
  const { rows } = await client.query<ModelTokenUsageRow>(
    `SELECT provider, COALESCE(model, 'unknown') AS model,
            count(*)::int AS "invocationCount", ${TOKEN_SUM_COLUMNS}
     FROM agent_token_usage
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY provider, COALESCE(model, 'unknown')
     ORDER BY "totalTokens" DESC, provider ASC, model ASC`,
    [window.since, window.until],
  );
  return rows;
}

async function queryDailyUsage(
  client: pg.Pool,
  window: ReportWindow,
): Promise<readonly DailyTokenUsageRow[]> {
  const { rows } = await client.query<DailyTokenUsageRow>(
    `SELECT
       to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
       COALESCE(sum(total_tokens), 0)::float8 AS "totalTokens",
       COALESCE(sum(cost_usd), 0)::float8 AS "costUsd"
     FROM agent_token_usage
     WHERE created_at >= $1 AND created_at < $2
     GROUP BY 1
     ORDER BY 1 ASC`,
    [window.since, window.until],
  );
  return rows;
}

async function queryCacheTotals(
  client: pg.Pool,
  window: ReportWindow,
): Promise<{
  readonly cachedReadTokens: number;
  readonly inputTokens: number;
}> {
  const { rows } = await client.query<{
    cachedReadTokens: number;
    inputTokens: number;
  }>(
    `SELECT
       COALESCE(sum(cached_read_tokens), 0)::float8 AS "cachedReadTokens",
       COALESCE(sum(input_tokens), 0)::float8 AS "inputTokens"
     FROM agent_token_usage
     WHERE created_at >= $1 AND created_at < $2`,
    [window.since, window.until],
  );
  return {
    cachedReadTokens: rows[0]?.cachedReadTokens ?? 0,
    inputTokens: rows[0]?.inputTokens ?? 0,
  };
}

/**
 * `metrics.model_token_usage` — invocation count, token sums, and cost by
 * `provider` and by `(provider, model)`, a daily token/cost time series, and
 * the window's overall cache hit ratio. Never selects `raw_usage`.
 */
export const modelTokenUsageMetricQuery: MetricQuery<ModelTokenUsageMetrics> = {
  name: 'model_token_usage',
  requires: {
    columns: {
      agent_token_usage: [
        'id',
        'provider',
        'model',
        'input_tokens',
        'output_tokens',
        'cached_read_tokens',
        'cached_write_tokens',
        'reasoning_tokens',
        'total_tokens',
        'cost_usd',
        'created_at',
      ],
    },
    tables: ['agent_token_usage'],
  },
  async run({
    client,
    window,
  }: MetricContext): Promise<ModelTokenUsageMetrics> {
    const [byProvider, byModel, dailyUsage, cacheTotals] = await Promise.all([
      queryByProvider(client, window),
      queryByModel(client, window),
      queryDailyUsage(client, window),
      queryCacheTotals(client, window),
    ]);

    const invocationCountInWindow = byProvider.reduce(
      (sum, row) => sum + row.invocationCount,
      0,
    );
    const totalPromptInput =
      cacheTotals.cachedReadTokens + cacheTotals.inputTokens;
    const cacheHitRatio =
      totalPromptInput > 0
        ? cacheTotals.cachedReadTokens / totalPromptInput
        : null;

    return {
      byModel,
      byProvider,
      cacheHitRatio,
      dailyUsage,
      invocationCountInWindow,
    };
  },
};

/** Invocation count for one favorited `(backend, model)` pair. */
export interface FavoriteModelRow {
  readonly backend: string;
  readonly count: number;
  readonly model: string;
}

export interface FavoriteModelsMetrics {
  readonly byBackendModel: readonly FavoriteModelRow[];
  readonly totalFavorites: number;
}

/**
 * `metrics.favorite_models` — how many users favorited each `(backend,
 * model)` pair, from `user_favorite_agent_models`. Unwindowed: this is a
 * presence table (a snapshot of current preference), not an event log.
 */
export const favoriteModelsMetricQuery: MetricQuery<FavoriteModelsMetrics> = {
  name: 'favorite_models',
  requires: {
    columns: { user_favorite_agent_models: ['id', 'backend', 'model'] },
    tables: ['user_favorite_agent_models'],
  },
  async run({ client }: MetricContext): Promise<FavoriteModelsMetrics> {
    const { rows } = await client.query<FavoriteModelRow>(
      `SELECT backend, model, count(*)::int AS count
       FROM user_favorite_agent_models
       GROUP BY backend, model
       ORDER BY count DESC, backend ASC, model ASC`,
    );
    return {
      byBackendModel: rows,
      totalFavorites: rows.reduce((sum, row) => sum + row.count, 0),
    };
  },
};

/** Count of disable rows for one `(backend, model)` pair; `model` is `null` for a whole-agent disable. */
export interface DisabledAgentCliRow {
  readonly backend: string;
  readonly count: number;
  readonly model: string | null;
}

export interface DisabledAgentClisMetrics {
  readonly byBackendModel: readonly DisabledAgentCliRow[];
  readonly totalDisables: number;
}

/**
 * `metrics.disabled_agent_clis` — how many users disabled each `(backend,
 * model)` pair, from `user_disabled_agent_clis`. `model IS NULL` means the
 * whole agent is disabled (migration 091's original semantics); a non-null
 * `model` is a single disabled model within an otherwise-enabled agent
 * (migration 092). Unwindowed for the same reason as `favorite_models`.
 */
export const disabledAgentClisMetricQuery: MetricQuery<DisabledAgentClisMetrics> =
  {
    name: 'disabled_agent_clis',
    requires: {
      columns: { user_disabled_agent_clis: ['id', 'backend', 'model'] },
      tables: ['user_disabled_agent_clis'],
    },
    async run({ client }: MetricContext): Promise<DisabledAgentClisMetrics> {
      const { rows } = await client.query<DisabledAgentCliRow>(
        `SELECT backend, model, count(*)::int AS count
         FROM user_disabled_agent_clis
         GROUP BY backend, model
         ORDER BY count DESC, backend ASC, model ASC NULLS FIRST`,
      );
      return {
        byBackendModel: rows,
        totalDisables: rows.reduce((sum, row) => sum + row.count, 0),
      };
    },
  };
