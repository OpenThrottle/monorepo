import {
  buildPostgresProfilingDedupeKey,
  shouldExplainPostgresStatement,
} from '../explain-dedupe/explain-dedupe.utils.ts';
import { extractExplainOutput } from '../explain-plan/explain-plan.utils.ts';
import { writePostgresExplainPlan } from '../explain-sink/explain-sink.utils.ts';
import {
  POSTGRES_EXPLAIN_ANALYZABLE_STATEMENT_PATTERN,
  POSTGRES_EXPLAIN_ANALYZE_OPTIONS,
  POSTGRES_EXPLAIN_DEFAULT_OPTIONS,
  POSTGRES_EXPLAIN_LOCKING_CLAUSE_PATTERN,
  POSTGRES_EXPLAIN_SELECT_INTO_PATTERN,
  POSTGRES_EXPLAINABLE_STATEMENT_PATTERN,
  POSTGRES_PROFILING_LOGGER,
  POSTGRES_PROFILING_LOGGER_CONTEXT,
  POSTGRES_PROFILING_MS_PER_SECOND,
} from '../postgres-profiling.constants.ts';
import type {
  CapturedQuery,
  PostgresExplainOption,
  PostgresExplainQueryManager,
  PostgresProfilingEnabledSettings,
  PostgresProfilingMethodOverrides,
} from '../postgres-profiling.types.ts';

const isAnalyzableStatement = (query: string): boolean => {
  return (
    POSTGRES_EXPLAIN_ANALYZABLE_STATEMENT_PATTERN.test(query) &&
    !POSTGRES_EXPLAIN_LOCKING_CLAUSE_PATTERN.test(query) &&
    !POSTGRES_EXPLAIN_SELECT_INTO_PATTERN.test(query)
  );
};

/**
 * @description Picks the `EXPLAIN` options for one captured statement. `ANALYZE`
 * executes the statement, so it is returned only when the env enables it, the method
 * has not opted out, and the statement is a plain `SELECT`; `WITH`, locking reads,
 * `SELECT ... INTO` and every write fall back to the estimate-only options. Matching is textual, so a keyword
 * inside a string literal errs toward the safe fallback.
 */
export const resolveExplainOptions = (
  settings: PostgresProfilingEnabledSettings,
  overrides: PostgresProfilingMethodOverrides,
  query: string,
): readonly PostgresExplainOption[] => {
  const isAnalyzeAllowed =
    settings.analyze &&
    overrides.analyze !== false &&
    isAnalyzableStatement(query);

  return isAnalyzeAllowed
    ? POSTGRES_EXPLAIN_ANALYZE_OPTIONS
    : POSTGRES_EXPLAIN_DEFAULT_OPTIONS;
};
const toErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error);
};

const toExplainStatement = (
  options: readonly PostgresExplainOption[],
  query: string,
): string => {
  return `EXPLAIN (${options.join(', ')}) ${query}`;
};

const explainCapturedQuery = async (
  settings: PostgresProfilingEnabledSettings,
  overrides: PostgresProfilingMethodOverrides,
  manager: PostgresExplainQueryManager,
  capturedQuery: CapturedQuery,
  className: string,
  methodName: string,
  durationMs: number,
): Promise<void> => {
  try {
    const rawResult = await manager.query(
      toExplainStatement(
        resolveExplainOptions(settings, overrides, capturedQuery.query),
        capturedQuery.query,
      ),
      Array.isArray(capturedQuery.parameters)
        ? capturedQuery.parameters
        : undefined,
    );

    await writePostgresExplainPlan(settings.output, {
      className,
      durationMs,
      methodName,
      plan: extractExplainOutput(rawResult) ?? rawResult,
      query: capturedQuery.query,
    });
  } catch (error: unknown) {
    POSTGRES_PROFILING_LOGGER.warn(
      `Could not explain a query from ${className}.${methodName}: ${toErrorMessage(error)}`,
      { context: POSTGRES_PROFILING_LOGGER_CONTEXT },
    );
  }
};

// Synchronous on settle so concurrent identical calls can't both pass dedupe; the duration
// check runs first so a fast call never takes a later slow call's dedupe slot.
export const selectQueriesToExplain = (
  settings: PostgresProfilingEnabledSettings,
  queries: readonly CapturedQuery[],
  className: string,
  methodName: string,
  durationMs: number,
): readonly CapturedQuery[] => {
  if (durationMs < settings.minDurationMs) {
    return [];
  }

  const nowMs = Date.now();
  const windowMs =
    settings.dedupeWindowSeconds * POSTGRES_PROFILING_MS_PER_SECOND;

  return queries
    .filter((capturedQuery) =>
      POSTGRES_EXPLAINABLE_STATEMENT_PATTERN.test(capturedQuery.query),
    )
    .filter((capturedQuery) =>
      shouldExplainPostgresStatement(
        buildPostgresProfilingDedupeKey(
          className,
          methodName,
          capturedQuery.query,
        ),
        nowMs,
        windowMs,
      ),
    );
};

const explainCapturedQueries = (
  settings: PostgresProfilingEnabledSettings,
  overrides: PostgresProfilingMethodOverrides,
  manager: PostgresExplainQueryManager,
  queries: readonly CapturedQuery[],
  className: string,
  methodName: string,
  durationMs: number,
): Promise<void> => {
  return queries.reduce(
    (previous, capturedQuery) =>
      previous.then(() =>
        explainCapturedQuery(
          settings,
          overrides,
          manager,
          capturedQuery,
          className,
          methodName,
          durationMs,
        ),
      ),
    Promise.resolve(),
  );
};

export const explainCapturedQueriesInBackground = async (
  settings: PostgresProfilingEnabledSettings,
  overrides: PostgresProfilingMethodOverrides,
  manager: PostgresExplainQueryManager,
  queries: readonly CapturedQuery[],
  className: string,
  methodName: string,
  durationMs: number,
): Promise<void> => {
  try {
    await explainCapturedQueries(
      settings,
      overrides,
      manager,
      queries,
      className,
      methodName,
      durationMs,
    );
  } catch (error: unknown) {
    POSTGRES_PROFILING_LOGGER.warn(
      `Background explain for ${className}.${methodName} failed: ${toErrorMessage(error)}`,
      { context: POSTGRES_PROFILING_LOGGER_CONTEXT },
    );
  }
};
