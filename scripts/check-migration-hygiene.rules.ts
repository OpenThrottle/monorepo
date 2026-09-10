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

/**
 * @description Where a duplicate-prefix judgement is being made from.
 *
 * `branch` carries the migration filenames present on the BASE REF TIP — not the
 * merge-base. That distinction is the whole point: a branch cut before a sibling
 * landed has a merge-base that cannot contain the sibling's file, so a merge-base
 * comparison is structurally blind to the collision the merge is about to create.
 *
 * `trunk` is the post-merge pass, where HEAD already IS the base. There is nothing
 * to compare against, so every duplicate in the tree is judged and only
 * grandfathering keeps applied history quiet.
 */
export type DuplicatePrefixScope =
  | { readonly baseFiles: readonly string[]; readonly kind: 'branch' }
  | { readonly kind: 'trunk' };

/** @description One numeric prefix claimed by more than one migration. */
export interface DuplicatePrefixCollision {
  /** Every migration sharing the prefix, base and tree together, sorted. */
  readonly files: readonly string[];
  /** The subset absent from the base ref — what this branch is adding to the pile. */
  readonly incoming: readonly string[];
  readonly prefix: string;
}

/**
 * @description Numeric prefixes claimed by more than one migration once this
 * branch is merged.
 *
 * The judged set is the UNION of the working tree and the base ref, because that
 * union IS the post-merge tree: migrations are only ever added, never renamed
 * (`schema_migrations` is keyed on filename) and never deleted. So a file on main
 * that this branch has not rebased onto is still a file the merge will produce,
 * and the union sees it where a `git diff` against the merge-base cannot.
 *
 * A collision is reported only when at least one of its files is INCOMING — absent
 * from the base ref. A pile that already exists wholly on main is somebody else's
 * problem and must not fail every unrelated PR; the trunk pass and the
 * grandfather list are what hold that case.
 */
export const findDuplicatePrefixCollisions = (
  treeFiles: readonly string[],
  scope: DuplicatePrefixScope,
  grandfathered: ReadonlySet<string>,
): readonly DuplicatePrefixCollision[] => {
  const baseFiles = scope.kind === 'branch' ? scope.baseFiles : [];
  const baseSet = new Set(baseFiles);

  const byPrefix = new Map<string, string[]>();
  for (const file of new Set([...treeFiles, ...baseFiles])) {
    if (!file.endsWith('.sql')) continue;
    const prefix = migrationPrefix(file);
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), file]);
  }

  const collisions: DuplicatePrefixCollision[] = [];
  for (const [prefix, files] of byPrefix) {
    if (files.length < 2) continue;
    if (grandfathered.has(prefix)) continue;

    const incoming = files.filter((file) => !baseSet.has(file)).sort();
    if (incoming.length === 0) continue;

    collisions.push({ files: [...files].sort(), incoming, prefix });
  }

  return collisions.sort((left, right) =>
    left.prefix.localeCompare(right.prefix),
  );
};
