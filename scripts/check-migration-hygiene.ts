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
 * The two rules have DIFFERENT scopes, and conflating them is what broke this
 * check once already:
 *
 *   Rule 1 judges file CONTENT, so it is DIFF-SCOPED against the merge-base.
 *   Only migrations this branch added or edited are read. Existing history is
 *   never re-litigated.
 *
 *   Rule 2 judges the SHAPE OF THE DIRECTORY after the merge, which no single
 *   branch's diff can describe. It runs unconditionally and compares against the
 *   TIP of the base ref, so a branch that added `110_a` is judged against a main
 *   that already has `110_b` — even though the branch never rebased and its
 *   merge-base predates both. Applied history is held quiet by the grandfather
 *   list alone, not by diff-scoping.
 *
 * Until 2026-09-10 rule 2 was diff-scoped like rule 1 AND gated on the branch
 * having touched a migration at all. Two concurrent branches each adding `NNN_`
 * therefore saw the prefix used exactly once and both passed. Four migrations
 * (110 x2, 111 x2) landed that way. Nothing re-checked afterwards, so nothing
 * ever reported it — see OT plan 21841c4f.
 *
 * Deliberately a STATIC check with no database connection, so it runs in CI on
 * every PR rather than only where Postgres happens to be reachable. `--all`
 * forces the trunk pass, which judges the whole tree with no base comparison.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { DuplicatePrefixScope } from './check-migration-hygiene.rules';
import {
  findDuplicatePrefixCollisions,
  findGuardedForeignKeyStatements,
} from './check-migration-hygiene.rules';
import { createLogger } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const MIGRATIONS_DIR = 'databases/migrations';

/**
 * Numeric prefixes duplicated on disk and accepted as applied history. Anything
 * NEW sharing a prefix is a violation.
 *
 * They are accepted rather than renamed because `schema_migrations` is keyed on
 * FILENAME: renaming an applied migration makes the runner see an unapplied file
 * and re-run it, while stranding a ledger row naming a file that no longer
 * exists. Grandfathering is the only safe way to hold these.
 *
 * TWO cohorts, and the difference matters to whoever reads this next:
 *
 *   084, 085, 087, 090, 092 — predate the rule, which shipped 2026-08-23
 *   (#421, `15171ce0`). Already duplicated when it landed.
 *
 *   110, 111 — landed 2026-09-07..09 (`9b8d4d0b`/`7a9a967f`, `9911178e`/`64ccecdd`),
 *   roughly two weeks AFTER the rule was live. Do NOT read them as more history
 *   the rule postdates. Each pair is two concurrent branches that never saw each
 *   other's file, and the rule was not running in CI at all. Both holes are
 *   closed — see OT plan 21841c4f.
 */
const GRANDFATHERED_DUPLICATE_PREFIXES = new Set([
  '084',
  '085',
  '087',
  '090',
  '092',
  '110',
  '111',
]);

const resolveBaseRef = (): string =>
  process.env.MIGRATION_COMMENT_LINT_BASE?.trim() ||
  process.env.GITHUB_BASE_REF?.trim() ||
  'main';

const revParse = (ref: string): string | null => {
  try {
    return execFileSync(
      'git',
      ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    ).trim();
  } catch {
    return null;
  }
};

/**
 * Merge-base of HEAD and an ALREADY-RESOLVED base commit, or `null` when there
 * is none to compute (unrelated histories, a truncated graph).
 *
 * It takes a commit rather than a ref name on purpose. This used to take the
 * raw ref and fall back to RETURNING THAT REF when `merge-base` failed — which
 * handed the caller the very string that had just proved unresolvable, so the
 * `git diff` built from it died with `fatal: bad revision`. Every CI PR run
 * takes that path: `MIGRATION_COMMENT_LINT_BASE` is a bare branch name like
 * `main`, and a CI checkout has no local `main`, only `origin/main`.
 */
const resolveMergeBase = (baseCommit: string): string | null => {
  try {
    return execFileSync('git', ['merge-base', 'HEAD', baseCommit], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
};

/**
 * The base ref's TIP commit, preferring the remote-tracking copy.
 *
 * The duplicate-prefix rule compares against this rather than the merge-base on
 * purpose — see `findDuplicatePrefixCollisions`. A local `main` can be weeks
 * stale, so `origin/main` is tried first and the bare ref is the fallback for a
 * clone with no remote.
 */
const resolveBaseTip = (baseRef: string): string | null =>
  revParse(`origin/${baseRef}`) ?? revParse(baseRef);

/** Migration basenames as of `commit`. */
const listMigrationFilesAt = (commit: string): readonly string[] =>
  execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', commit, '--', `${MIGRATIONS_DIR}/`],
    { cwd: ROOT, encoding: 'utf8' },
  )
    .split('\n')
    .map((file) => path.basename(file.trim()))
    .filter((file) => file.endsWith('.sql'));

/** Migration basenames on disk right now. */
const listMigrationFilesOnDisk = (): readonly string[] =>
  readdirSync(path.join(ROOT, MIGRATIONS_DIR)).filter((file) =>
    file.endsWith('.sql'),
  );

/**
 * Whether this run judges a branch against its base, or the trunk against itself.
 *
 * `--all` forces trunk mode. Otherwise it is inferred: on a push to `main` the
 * base tip IS HEAD, so there is no incoming file to find and a branch-scoped run
 * would report nothing — exactly the post-merge blindness this check exists to
 * remove. An unresolvable base ref (shallow clone, unknown remote) also falls to
 * trunk mode, which is the stricter of the two: fail closed, never silently open.
 */
const resolveDuplicatePrefixScope = (
  baseTip: string | null,
): DuplicatePrefixScope => {
  if (process.argv.includes('--all')) return { kind: 'trunk' };

  if (baseTip === null) return { kind: 'trunk' };

  if (baseTip === revParse('HEAD')) return { kind: 'trunk' };

  return { baseFiles: listMigrationFilesAt(baseTip), kind: 'branch' };
};

const listChangedMigrationFiles = (
  mergeBase: string | null,
): readonly string[] => {
  // No merge-base means no diff to scope by. The foreign-key rule reads file
  // CONTENT and 32 migrations already in applied history trip it, so widening
  // to the whole tree here would fail every run on history nobody can change.
  // Reporting nothing matches what this rule already does on a trunk push,
  // where the merge-base IS HEAD — and the caller warns loudly either way.
  if (mergeBase === null) return [];

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
  baseRef: string,
  baseTip: string | null,
): readonly string[] => {
  const scope = resolveDuplicatePrefixScope(baseTip);

  return findDuplicatePrefixCollisions(
    listMigrationFilesOnDisk(),
    scope,
    GRANDFATHERED_DUPLICATE_PREFIXES,
  ).map(
    ({ files, incoming, prefix }) =>
      `${MIGRATIONS_DIR}/: numeric prefix ${prefix} is used by ${files.length} migrations ` +
      `(${files.join(', ')}). A prefix must identify exactly one migration — renumber ` +
      `${incoming.join(', ')}. ` +
      (scope.kind === 'branch'
        ? `Note the pile is measured against the tip of ${baseRef}, not your merge-base: ` +
          `a sibling branch may have landed its half after you cut this one, so renumbering ` +
          `is needed even though nothing here changed.`
        : `This is the post-merge pass on the trunk, so the collision is ALREADY on main. ` +
          `Renaming an applied migration is not the fix — schema_migrations is keyed on ` +
          `filename. Grandfather the prefix and record why.`),
  );
};

const run = (): void => {
  const baseRef = resolveBaseRef();

  // Resolved ONCE and shared: both rules key off the same base commit, and
  // resolving per-rule is how they drifted into disagreeing about what `main`
  // even meant. `origin/<ref>` is preferred over the bare name — see
  // `resolveBaseTip`.
  const baseTip = resolveBaseTip(baseRef);
  if (baseTip === null) {
    logger.warn(
      `check-migration-hygiene: cannot resolve ${baseRef}; the foreign-key rule ` +
        `has no diff to scope by and reports nothing, and the duplicate-prefix ` +
        `rule judges the whole tree`,
    );
  }

  const changedFiles = listChangedMigrationFiles(
    baseTip === null ? null : resolveMergeBase(baseTip),
  );

  // ⚠️ The two rules have DIFFERENT scopes, deliberately.
  //
  // The foreign-key rule judges file CONTENT, so it only ever needs to read what
  // this branch wrote — diff-scoped against the merge-base, unchanged.
  //
  // The duplicate-prefix rule judges the SHAPE OF THE DIRECTORY, which is a
  // property of the merged tree and not of any one branch's diff. It therefore
  // runs unconditionally, including on a branch whose diff touches no migration
  // at all. Gating it on `changedFiles.length` — as this script did until
  // 2026-09-10 — is precisely what let 110 and 111 through.
  const violations = [
    ...changedFiles.flatMap(checkGuardedForeignKeys),
    ...checkDuplicatePrefixes(baseRef, baseTip),
  ];

  if (violations.length > 0) {
    for (const violation of violations) {
      logger.fail(`check-migration-hygiene: error: ${violation}`);
    }
    logger.fail(
      `check-migration-hygiene: ${violations.length} violation(s) (${changedFiles.length} changed migration file(s) vs ${baseRef})`,
    );
    process.exit(1);
  }

  logger.success(
    `check-migration-hygiene: OK (${changedFiles.length} changed migration file(s) vs ${baseRef}; no duplicate prefixes)`,
  );
};

run();
