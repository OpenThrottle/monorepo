/**
 * @description The shared-database migration guard. A worktree on
 * `OT_WORKTREE_DB=shared` points at the primary's Postgres, so a branch that
 * adds `databases/migrations/1xx_*.sql` must never apply it there: drift
 * detection is warn-only (later edits never re-apply), an abandoned branch
 * leaves tables or columns behind, and number collisions land in real data.
 *
 * The rule: in shared mode, every migration file in this checkout must already
 * exist on `origin/main`. Migrations that ARE on origin/main apply normally (a
 * worktree branched off a newer main than the primary still works). Primary and
 * isolated checkouts are never guarded. The check runs before any database
 * connection, so a refusal applies nothing and cannot seed the ledger.
 *
 * Fetching is the caller's job: this compares against the LOCAL `origin/main`
 * ref and fails closed (refuses) when it is missing.
 *
 * Dependency-free (node builtins + sibling utils only).
 */
import { gitOutput } from './git.ts';
import type { WorktreeDbMode } from './worktree-db.ts';

/** The remote-tracking ref shared-DB worktrees compare their migrations against. */
export const ORIGIN_MAIN_REF = 'origin/main';

/** Repo-relative migrations directory. */
export const MIGRATIONS_DIR = 'databases/migrations';

/** What the guard decided. `refused.message` is ready to print. */
export type MigrationGuardResult =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'refused'; readonly message: string };

/** `.sql` basenames, sorted: the migrations as the runner sees them. */
const sqlFiles = (entries: readonly string[]): string[] =>
  entries.filter((entry) => entry.endsWith('.sql')).sort();

/** Migration files present locally but absent from origin/main (sorted). */
export const findBranchOnlyMigrations = (
  localFiles: readonly string[],
  originMainFiles: readonly string[],
): string[] => {
  const onMain = new Set(originMainFiles);

  return sqlFiles(localFiles).filter((file) => !onMain.has(file));
};

/** The message a refused shared-DB worktree prints. */
export const branchMigrationsMessage = (files: readonly string[]): string =>
  `this branch adds migrations ${files.join(', ')}; a shared-DB worktree cannot apply them. Run \`pnpm worktree:db isolate\`.`;

/** The message printed when origin/main cannot be read (fail closed). */
export const missingOriginMainMessage = (): string =>
  `cannot compare this branch's migrations with ${ORIGIN_MAIN_REF}: the ref is missing, so a shared-DB worktree refuses to apply any migration. Run \`git fetch origin main\` and retry.`;

/**
 * Pure decision. `originMainFiles` is `undefined` when the ref could not be
 * read; that refuses in shared mode (fail closed) and is irrelevant otherwise.
 */
export const evaluateMigrationGuard = (input: {
  readonly localFiles: readonly string[];
  readonly mode: WorktreeDbMode;
  readonly originMainFiles: readonly string[] | undefined;
}): MigrationGuardResult => {
  if (input.mode !== 'shared') {
    return { kind: 'allowed' };
  }

  if (input.originMainFiles === undefined) {
    return { kind: 'refused', message: missingOriginMainMessage() };
  }

  const added = findBranchOnlyMigrations(input.localFiles, input.originMainFiles); // prettier-ignore

  return added.length === 0
    ? { kind: 'allowed' }
    : { kind: 'refused', message: branchMigrationsMessage(added) };
};

/**
 * Migration basenames on the local `origin/main` ref, or `undefined` when the
 * ref (or its migrations directory) cannot be read. Never touches the network.
 */
export const listOriginMainMigrations = (cwd: string): string[] | undefined => {
  if (
    gitOutput(
      [
        'rev-parse',
        '--verify',
        '--quiet',
        `refs/remotes/${ORIGIN_MAIN_REF}^{commit}`,
      ],
      cwd,
    ) === undefined
  ) {
    return undefined;
  }

  const listing = gitOutput(['ls-tree', '--name-only', `${ORIGIN_MAIN_REF}:${MIGRATIONS_DIR}`], cwd); // prettier-ignore

  return listing === undefined ? undefined : sqlFiles(listing.split('\n'));
};

/**
 * Run the guard for the checkout at `cwd`. `localFiles` are the migration
 * filenames the runner is about to consider. Git is consulted only in shared
 * mode, so primary and isolated checkouts pay nothing.
 */
export const checkMigrationGuard = (input: {
  readonly cwd: string;
  readonly localFiles: readonly string[];
  readonly mode: WorktreeDbMode;
}): MigrationGuardResult =>
  evaluateMigrationGuard({
    localFiles: input.localFiles,
    mode: input.mode,
    originMainFiles:
      input.mode === 'shared' ? listOriginMainMigrations(input.cwd) : undefined,
  });
