/**
 * @description The shared-database migration guard. A worktree on
 * `OT_WORKTREE_DB=shared` points at the primary's Postgres, so a branch that
 * adds a migration to ANY database (`databases/<db>/migrations/*.sql`) must
 * never apply it there: drift detection is warn-only (later edits never
 * re-apply), an abandoned branch leaves tables or columns behind, and number
 * collisions land in real data.
 *
 * The rule: in shared mode, every migration file in this checkout must already
 * exist on `origin/main`, database by database. A database whose migrations
 * directory is not on `origin/main` at all counts every local file as
 * branch-only. Migrations that ARE on origin/main apply normally (a worktree
 * branched off a newer main than the primary still works). Primary and isolated
 * checkouts are never guarded. The check runs before any database connection,
 * so a refusal applies nothing and cannot seed the ledger.
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

/** Repo-relative migrations directory of the primary (openthrottle) database. */
export const MIGRATIONS_DIR = 'databases/openthrottle/migrations';

/** Where the primary database's migrations lived before `databases/` held more than one database. */
export const LEGACY_MIGRATIONS_DIRS: readonly string[] = [
  'databases/migrations',
];

/** What the guard decided. `refused.message` is ready to print. */
export type MigrationGuardResult =
  | { readonly kind: 'allowed' }
  | { readonly kind: 'refused'; readonly message: string };

/** `.sql` basenames, sorted: the migrations as the runner sees them. */
const sqlFiles = (entries: readonly string[]): string[] => {
  return entries.filter((entry) => entry.endsWith('.sql')).sort();
};

/** Migration files present locally but absent from origin/main (sorted). */
export const findBranchOnlyMigrations = (
  localFiles: readonly string[],
  originMainFiles: readonly string[],
): string[] => {
  const onMain = new Set(originMainFiles);

  return sqlFiles(localFiles).filter((file) => !onMain.has(file));
};

/** The message a refused shared-DB worktree prints. `database` names which one, when known. */
export const branchMigrationsMessage = (
  files: readonly string[],
  database: string | undefined = undefined,
): string => {
  const where = database === undefined ? '' : ` to the ${database} database`;

  return `this branch adds migrations${where} ${files.join(', ')}; a shared-DB worktree cannot apply them. Run \`pnpm worktree:db isolate\`.`;
};

/** The message printed when origin/main cannot be read (fail closed). */
export const missingOriginMainMessage = (): string => {
  return `cannot compare this branch's migrations with ${ORIGIN_MAIN_REF}: the ref is missing, so a shared-DB worktree refuses to apply any migration. Run \`git fetch origin main\` and retry.`;
};

/**
 * Pure decision. `originMainFiles` is `undefined` when the ref could not be
 * read; that refuses in shared mode (fail closed) and is irrelevant otherwise.
 */
export const evaluateMigrationGuard = (input: {
  readonly database?: string;
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

  if (added.length === 0) {
    return { kind: 'allowed' };
  }

  return {
    kind: 'refused',
    message: branchMigrationsMessage(added, input.database),
  };
};

/**
 * Migration basenames on the local `origin/main` ref, or `undefined` when the
 * ref itself cannot be read. Never touches the network.
 *
 * `migrationsDir` is tried first, then each of `legacyDirs`, so a branch that
 * MOVED a database's migrations still compares against main's copy of them.
 * When none is on main the database is new there and the answer is `[]`, which
 * makes every local file branch-only.
 */
export const listOriginMainMigrations = (
  cwd: string,
  migrationsDir: string = MIGRATIONS_DIR,
  legacyDirs: readonly string[] = LEGACY_MIGRATIONS_DIRS,
): string[] | undefined => {
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

  for (const dir of [migrationsDir, ...legacyDirs]) {
    const listing = gitOutput(['ls-tree', '--name-only', `${ORIGIN_MAIN_REF}:${dir}`], cwd); // prettier-ignore
    if (listing !== undefined) return sqlFiles(listing.split('\n'));
  }

  return [];
};

/**
 * Run the guard for ONE database in the checkout at `cwd`. `localFiles` are the
 * migration filenames the runner is about to consider for it. Git is consulted
 * only in shared mode, so primary and isolated checkouts pay nothing. The
 * directory options default to the primary database's.
 */
export const checkMigrationGuard = (input: {
  readonly cwd: string;
  readonly database?: string;
  readonly legacyMigrationsDirs?: readonly string[];
  readonly localFiles: readonly string[];
  readonly migrationsDir?: string;
  readonly mode: WorktreeDbMode;
}): MigrationGuardResult => {
  let originMainFiles: string[] | undefined;
  if (input.mode === 'shared') {
    originMainFiles = listOriginMainMigrations(
      input.cwd,
      input.migrationsDir,
      input.legacyMigrationsDirs,
    );
  }

  return evaluateMigrationGuard({
    database: input.database,
    localFiles: input.localFiles,
    mode: input.mode,
    originMainFiles,
  });
};
