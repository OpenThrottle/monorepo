import type pg from 'pg';

/**
 * @description Wraps a real `pg.Pool`'s `.query` so every SQL statement text
 * issued through it during a test is recorded, while every call still reaches
 * the real database unchanged. Uses `Object.defineProperty` rather than
 * `pool.query = wrapper` because `pg.Pool.query` is overloaded and TypeScript
 * collapses an overloaded method reference to its last (callback, `void`
 * -returning) signature — the repo bans `as` casts, so this is the
 * cast-free way to replace it. See `fake-pool.ts` for the fully-mocked
 * counterpart used by the pure unit tests.
 */
export function recordQueries(pool: pg.Pool): {
  restore(): void;
  statements: string[];
} {
  const statements: string[] = [];
  const original = pool.query.bind(pool);

  Object.defineProperty(pool, 'query', {
    configurable: true,
    value: (...args: Parameters<typeof original>) => {
      const [first] = args;
      const text = typeof first === 'string' ? first : String(first);
      statements.push(text);
      return original(...args);
    },
    writable: true,
  });

  return {
    restore(): void {
      Object.defineProperty(pool, 'query', {
        configurable: true,
        value: original,
        writable: true,
      });
    },
    statements,
  };
}

/** True when `sql` reads as a read-only statement: a bare `SELECT`, or a `WITH ... SELECT` CTE. */
export function isSelectOnly(sql: string): boolean {
  const normalized = sql.trim();
  const startsAsRead = /^(WITH\b[\s\S]*?\bSELECT\b|SELECT\b)/i.test(normalized);
  if (!startsAsRead) return false;

  // Defensive belt-and-suspenders: no write/DDL keyword anywhere in the text,
  // as a whole word (avoids false positives like a column named "selected").
  const writeKeyword =
    /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT|REVOKE|CREATE|MERGE)\b/i;
  return !writeKeyword.test(normalized);
}
