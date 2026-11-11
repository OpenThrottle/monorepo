import { AsyncLocalStorage } from 'node:async_hooks';

import { POSTGRES_EXPLAIN_STATEMENT_PATTERN } from '../postgres-profiling.constants.ts';
import type {
  CapturedQuery,
  QueryCaptureResult,
} from '../postgres-profiling.types.ts';

const queryCaptureStorage = new AsyncLocalStorage<CapturedQuery[]>();

/**
 * @description Appends to the capture scope of the current async context.
 * No-op outside a scope, and for `EXPLAIN` statements so explaining a captured
 * query can never capture its own explain.
 */
export const captureQuery = (capturedQuery: CapturedQuery): void => {
  const store = queryCaptureStorage.getStore();

  if (!store || POSTGRES_EXPLAIN_STATEMENT_PATTERN.test(capturedQuery.query)) {
    return;
  }

  store.push(capturedQuery);
};

/**
 * @description Never rejects: a thrown error comes back as `ok: false` alongside
 * the queries captured before it, so the caller can still explain them.
 */
export const runWithQueryCapture = async <T>(
  fn: () => Promise<T> | T,
): Promise<QueryCaptureResult<T>> => {
  const queries: CapturedQuery[] = [];

  try {
    const value = await queryCaptureStorage.run(queries, fn);

    return { ok: true, queries, value };
  } catch (error: unknown) {
    return { error, ok: false, queries };
  }
};
