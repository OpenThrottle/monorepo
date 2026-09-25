import pg from 'pg';
import type { Mock } from 'vitest';
import { vi } from 'vitest';

/**
 * @description A real (never-connecting) `pg.Pool` for unit tests, with
 * `.query` replaced by a mock the caller drives directly.
 *
 * `pg.Pool.query` is overloaded (string, config, callback, stream variants);
 * TypeScript collapses an overloaded method reference to its LAST signature
 * (a callback form returning `void`), so `vi.spyOn(pool, 'query').mockResolvedValue(...)`
 * fails to typecheck against the Promise-returning shape our code actually
 * calls — and the repo bans `as` casts, so we cannot force it through.
 * `Object.defineProperty` sidesteps this: `PropertyDescriptor.value` is typed
 * `any`, so assigning the mock there needs no cast while still operating on a
 * genuine `pg.Pool` instance (never a hand-rolled object pretending to be one).
 */
export function newPoolWithMockQuery(): {
  pool: pg.Pool;
  query: Mock;
} {
  const pool = new pg.Pool({
    connectionString: 'postgresql://placeholder@localhost:1/placeholder',
  });
  const query = vi.fn();
  Object.defineProperty(pool, 'query', {
    configurable: true,
    value: query,
    writable: true,
  });
  return { pool, query };
}

/** Shape returned by every fake `.query` call in these tests — the fields `pg.QueryResult` requires. */
export function queryResult<T>(rows: readonly T[]): {
  command: string;
  fields: readonly never[];
  oid: number;
  rowCount: number;
  rows: readonly T[];
} {
  return { command: 'SELECT', fields: [], oid: 0, rowCount: rows.length, rows };
}
