import { POSTGRES_PROFILING_DEDUPE_MAX_ENTRIES } from '../postgres-profiling.constants.ts';

const lastExplainedAtMsByKey = new Map<string, number>();

export const buildPostgresProfilingDedupeKey = (
  className: string,
  methodName: string,
  query: string,
): string => {
  const key = `${className}.${methodName}\n${query}`;

  return key;
};

/**
 * @description Returns `true` when `key` has not been explained within `windowMs`, and
 * records it as explained at `nowMs` in the same call, so the caller must go on to explain
 * it. A `windowMs` of `0` always returns `true` and records nothing. The map holds at most
 * `POSTGRES_PROFILING_DEDUPE_MAX_ENTRIES` keys and drops the least recently explained first.
 */
export const shouldExplainPostgresStatement = (
  key: string,
  nowMs: number,
  windowMs: number,
): boolean => {
  if (windowMs <= 0) {
    return true;
  }

  const lastExplainedAtMs = lastExplainedAtMsByKey.get(key);

  if (lastExplainedAtMs !== undefined && nowMs - lastExplainedAtMs < windowMs) {
    return false;
  }

  // Delete before set so a re-explained key moves to the end of the insertion order.
  lastExplainedAtMsByKey.delete(key);
  lastExplainedAtMsByKey.set(key, nowMs);

  for (const oldestKey of lastExplainedAtMsByKey.keys()) {
    if (lastExplainedAtMsByKey.size <= POSTGRES_PROFILING_DEDUPE_MAX_ENTRIES) {
      break;
    }

    lastExplainedAtMsByKey.delete(oldestKey);
  }

  return true;
};

/** Test-only: forgets every explained key. */
export const resetPostgresProfilingDedupe = (): void => {
  lastExplainedAtMsByKey.clear();
};
