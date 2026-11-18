/**
 * @description Pure rules behind `check-migration-table-comments.ts`, kept
 * separate from the script so they can be unit-tested without executing the
 * check (which shells out to git and may call process.exit).
 */

const CREATE_TABLE_PATTERN =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z][a-z0-9_]*)/gi;

const COMMENT_ON_TABLE_PATTERN = /COMMENT\s+ON\s+TABLE\s+([a-z][a-z0-9_]*)/gi;

/**
 * @description Blanks out everything in a migration that is prose rather than
 * SQL: `--` line comments, `/* *\/` block comments and single-quoted string
 * literals (with `''` escapes). Without this, a header comment saying "CREATE
 * TABLE IF NOT EXISTS already guards this" reports tables named `IF` and
 * `already`, and a `COMMENT ON TABLE x IS '… CREATE TABLE y …'` reports `y`.
 *
 * Each removed span becomes a single space so the tokens on either side stay
 * apart. `$$` bodies are kept: a CREATE TABLE inside a DO block is real.
 */
export const stripSqlProse = (sql: string): string => {
  let output = '';
  let index = 0;

  while (index < sql.length) {
    if (sql.startsWith('--', index)) {
      const end = sql.indexOf('\n', index);
      index = end === -1 ? sql.length : end;
      output += ' ';
      continue;
    }

    if (sql.startsWith('/*', index)) {
      const end = sql.indexOf('*/', index + 2);
      index = end === -1 ? sql.length : end + 2;
      output += ' ';
      continue;
    }

    if (sql[index] === "'") {
      index += 1;
      while (index < sql.length) {
        if (sql[index] === "'" && sql[index + 1] === "'") {
          index += 2;
          continue;
        }
        if (sql[index] === "'") {
          index += 1;
          break;
        }
        index += 1;
      }
      output += ' ';
      continue;
    }

    output += sql[index] ?? '';
    index += 1;
  }

  return output;
};

const collectTableNames = (sql: string, pattern: RegExp): readonly string[] => {
  const re = new RegExp(pattern.source, pattern.flags);

  return [...sql.matchAll(re)].flatMap((match) => {
    return match[1] === undefined ? [] : [match[1].toLowerCase()];
  });
};

/**
 * @description Tables a migration creates without a matching COMMENT ON TABLE
 * in the same file. Matching runs on {@link stripSqlProse} output, so neither
 * comment prose nor string literals can create or satisfy a table.
 */
export const findUncommentedTables = (sql: string): readonly string[] => {
  const code = stripSqlProse(sql);
  const created = collectTableNames(code, CREATE_TABLE_PATTERN);
  const commented = new Set(collectTableNames(code, COMMENT_ON_TABLE_PATTERN));

  return created.filter((table) => {
    return !commented.has(table);
  });
};
