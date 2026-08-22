/**
 * @description Static lint for `databases/migrations/`, guarding the two hygiene
 * failures found by the 2026-08-21 database health sweep (OT plan 70239a50):
 *
 *   1. FOREIGN-KEY SKIP — an inline `REFERENCES` inside a statement guarded by
 *      `IF NOT EXISTS`. When the table or column already exists the guard skips
 *      the WHOLE statement, so the column lands without its constraint while the
 *      schema_migrations ledger still records the migration as applied, and
 *      nothing reconciles afterwards. This produced 15 missing foreign keys on
 *      the live database — and orphan rows behind them — entirely silently.
 *
 *   2. DUPLICATE NUMERIC PREFIXES — two migrations sharing `NNN_`. Application
 *      order is filename-lexicographic so it stays well-defined, but the prefix
 *      stops identifying a migration, which breaks tooling (and humans) that
 *      assume it does.
 *
 * Both checks are DIFF-SCOPED against the base ref, so existing history is never
 * re-litigated: only migrations added or edited on this branch are judged. Rule 2
 * additionally grandfathers the prefixes that were already duplicated.
 *
 * Deliberately a STATIC check with no database connection, so it runs in CI on
 * every PR rather than only where Postgres happens to be reachable.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  findGuardedForeignKeyStatements,
  migrationPrefix,
} from './check-migration-hygiene.rules';

const ROOT = process.cwd();
const MIGRATIONS_DIR = 'databases/migrations';

/**
 * Numeric prefixes already duplicated when this check was introduced. They are
 * applied history and cannot be renamed, so they are accepted; anything NEW
 * sharing a prefix is a violation.
 */
const GRANDFATHERED_DUPLICATE_PREFIXES = new Set([
  '084',
  '085',
  '087',
  '090',
  '092',
]);

const resolveBaseRef = (): string =>
  process.env.MIGRATION_COMMENT_LINT_BASE?.trim() ||
  process.env.GITHUB_BASE_REF?.trim() ||
  'main';

const resolveMergeBase = (baseRef: string): string => {
  try {
    return execFileSync('git', ['merge-base', 'HEAD', baseRef], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return baseRef;
  }
};

const listChangedMigrationFiles = (baseRef: string): readonly string[] => {
  const mergeBase = resolveMergeBase(baseRef);
  const output = execFileSync(
    'git',
    [
      'diff',
      '--name-only',
      // Exclude deletions. A migration removed or renumbered on this branch has
      // no file left to read, and reading it would crash the check instead of
      // reporting anything useful. A rename still surfaces as its added path.
      '--diff-filter=d',
      `${mergeBase}...HEAD`,
      '--',
      `${MIGRATIONS_DIR}/`,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();

  if (!output) return [];

  return (
    output
      .split('\n')
      .map((file) => file.trim())
      .filter((file) => file.endsWith('.sql'))
      // The path list comes from a COMMIT diff but the rules read the WORKING
      // TREE, so the two can legitimately disagree — a migration deleted or
      // renumbered after the last commit is named by the diff but is no longer
      // on disk. Skip what isn't there rather than crashing on it.
      .filter((file) => existsSync(path.join(ROOT, file)))
  );
};

const checkGuardedForeignKeys = (relativePath: string): readonly string[] => {
  const sql = readFileSync(path.join(ROOT, relativePath), 'utf8');

  return findGuardedForeignKeyStatements(sql).map(
    () =>
      `${relativePath}: inline REFERENCES inside an IF NOT EXISTS statement. ` +
      `If the table or column already exists the guard skips the whole statement, the ` +
      `foreign key is never created, and the ledger still marks the migration applied. ` +
      `Create the table or column first, then add the constraint in its own statement ` +
      `guarded on pg_constraint (see databases/README.md § Foreign keys in migrations).`,
  );
};

const checkDuplicatePrefixes = (
  changedFiles: readonly string[],
): readonly string[] => {
  const changedBasenames = new Set(
    changedFiles.map((file) => path.basename(file)),
  );

  const byPrefix = new Map<string, string[]>();
  for (const file of readdirSync(path.join(ROOT, MIGRATIONS_DIR))) {
    if (!file.endsWith('.sql')) continue;
    const prefix = migrationPrefix(file);
    byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), file]);
  }

  const violations: string[] = [];
  for (const [prefix, files] of byPrefix) {
    if (files.length < 2) continue;
    if (GRANDFATHERED_DUPLICATE_PREFIXES.has(prefix)) continue;
    // Only complain when THIS branch introduced one of the colliding files.
    if (!files.some((file) => changedBasenames.has(file))) continue;

    violations.push(
      `${MIGRATIONS_DIR}/: numeric prefix ${prefix} is used by ${files.length} migrations ` +
        `(${files.join(', ')}). A prefix must identify exactly one migration — renumber the new file.`,
    );
  }

  return violations;
};

const run = (): void => {
  const baseRef = resolveBaseRef();
  const changedFiles = listChangedMigrationFiles(baseRef);

  if (changedFiles.length === 0) {
    console.log(
      `check-migration-hygiene: OK (no changed files under ${MIGRATIONS_DIR}/ vs ${baseRef})`,
    );
    return;
  }

  const violations = [
    ...changedFiles.flatMap(checkGuardedForeignKeys),
    ...checkDuplicatePrefixes(changedFiles),
  ];

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`check-migration-hygiene: error: ${violation}`);
    }
    console.error(
      `check-migration-hygiene: ${violations.length} violation(s) across ${changedFiles.length} changed migration file(s)`,
    );
    process.exit(1);
  }

  console.log(
    `check-migration-hygiene: OK (${changedFiles.length} changed migration file(s) vs ${baseRef})`,
  );
};

run();
