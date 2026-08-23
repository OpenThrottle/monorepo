/**
 * @description Pure rules behind `check-migration-hygiene.ts`, kept separate from
 * the script so they can be unit-tested without executing the check (which shells
 * out to git and may call process.exit).
 */

/** Strips `--` line comments so keywords inside prose never trip the checks. */
export const stripComments = (sql: string): string =>
  sql.replace(/--[^\n]*/g, '');

/**
 * @description Splits SQL into top-level statements.
 *
 * Tracks `$$`-quoted bodies so semicolons inside a DO block or function body do
 * not split a statement — the idempotent DO-block guard this check steers people
 * toward is full of them, and splitting inside one would report its `REFERENCES`
 * as if it were an unguarded inline declaration.
 */
export const splitStatements = (sql: string): readonly string[] => {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let index = 0;

  while (index < sql.length) {
    if (sql.startsWith('$$', index)) {
      inDollarQuote = !inDollarQuote;
      current += '$$';
      index += 2;
      continue;
    }

    const char = sql[index] ?? '';
    index += 1;

    if (char === ';' && !inDollarQuote) {
      statements.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) statements.push(current);

  return statements.filter((statement) => statement.trim().length > 0);
};

/**
 * @description True when a statement both creates something conditionally and
 * declares an inline foreign key — the exact shape whose constraint silently goes
 * missing when the guard skips the statement.
 */
export const hasGuardedForeignKey = (statement: string): boolean => {
  const isGuardedCreate =
    /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS/i.test(statement) ||
    /ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS/i.test(statement);

  return isGuardedCreate && /\bREFERENCES\b/i.test(statement);
};

/**
 * @description Statements in `sql` that declare a foreign key under an
 * `IF NOT EXISTS` guard. Empty when the file is clean.
 */
export const findGuardedForeignKeyStatements = (
  sql: string,
): readonly string[] =>
  splitStatements(stripComments(sql)).filter(hasGuardedForeignKey);

/** @description Numeric prefix of a migration filename (`097_foo.sql` -> `097`). */
export const migrationPrefix = (filename: string): string =>
  filename.split('_')[0] ?? '';
