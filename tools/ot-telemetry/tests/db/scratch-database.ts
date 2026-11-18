import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
  sanitizePostgresUrlForLogs,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';

const execFileAsync = promisify(execFile);

/**
 * @description Spins up (and tears down) a throwaway, fully-migrated Postgres
 * *database* on the same local server the repo's `pnpm run database:start`
 * already runs — never a second Postgres server/container, per this task's
 * instruction not to start one in a worktree. Each test file gets its own
 * database (not schema) so `DROP TABLE` experiments in one test can never
 * affect another, and the databases are dropped again in `afterAll`.
 *
 * Loads `.env` from the repo root (the same file the `report` target is invoked with
 * via `--env-file=.env`) if present, and forces `POSTGRES_HOST=localhost`
 * (the committed default is `host.docker.internal`, which only resolves
 * inside a container) — matching the exact invocation this tool documents
 * for running the report locally.
 */

const REPO_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
);
const MIGRATIONS_RUNNER = join(
  REPO_ROOT,
  'scripts',
  'openthrottle-database-migrations.ts',
);

function loadRepoEnvFile(): void {
  try {
    process.loadEnvFile(join(REPO_ROOT, '.env'));
  } catch {
    // No .env at the repo root (e.g. a fresh checkout) — fall through and let
    // whatever the environment already provides (or doesn't) decide.
  }
  // The committed default targets a container hostname; tests always run on
  // the host, so this is the one override applied unconditionally.
  process.env.POSTGRES_HOST = 'localhost';
}

/** Resolves the base connection string, or `null` when required env is missing entirely. */
function tryResolveBaseUrl(): string | null {
  loadRepoEnvFile();
  try {
    return getPostgresUrl(process.env);
  } catch {
    return null;
  }
}

/** True when a real Postgres answers at the resolved connection — never throws. */
export async function isLocalPostgresReachable(): Promise<boolean> {
  const baseUrl = tryResolveBaseUrl();
  if (!baseUrl) return false;

  const client = new pg.Client({ connectionString: baseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

function withDatabaseName(baseUrl: string, database: string): string {
  const url = new URL(baseUrl);
  url.pathname = `/${database}`;
  return url.toString();
}

/**
 * Applies every migration via the SAME ledgered runner `pnpm run
 * database:migrate` uses (`scripts/openthrottle-database-migrations.ts`),
 * run as a subprocess (`tsx`) rather than imported directly — that script
 * lives under the root `monorepo` project, whose own `typecheck` target is a
 * no-op, so importing it into this (real-typecheck) project would drag its
 * pre-existing, never-checked type errors into this package's build. Shelling
 * out keeps the same behavior (a populated `schema_migrations` ledger, exactly
 * like a real dev DB) without that coupling.
 *
 * `--database openthrottle` keeps the run on the scratch database: the runner
 * derives every other registered database (`cms`) from the primary URL by name,
 * which would land on the server's real `cms` database. Aimed only at the
 * scratch name, the run also passes the shared-DB worktree guard, which
 * protects the shared database rather than every database on the server.
 */
async function migrateScratchDatabase(connectionString: string): Promise<void> {
  const args = ['exec', 'tsx', MIGRATIONS_RUNNER, '--database', 'openthrottle'];
  await execFileAsync('pnpm', args, {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      [OPENTHROTTLE_POSTGRES_URL_ENV]: connectionString,
    },
  });
}

export interface ScratchDatabase {
  /** Drops the scratch database. Safe to call once. */
  drop(): Promise<void>;
  /** A writable pool connected to the scratch database (fully migrated). */
  pool: pg.Pool;
  readonly sanitizedUrl: string;
}

/**
 * @description The one `DROP DATABASE` both teardown paths share — the
 * caller's {@link ScratchDatabase.drop} and the failure path inside
 * {@link createScratchDatabase} — so the two can never drift. `WITH (FORCE)`
 * terminates any connection a half-finished migration left open.
 */
async function dropScratchDatabase(
  baseUrl: string,
  name: string,
): Promise<void> {
  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  } finally {
    await admin.end();
  }
}

/**
 * @description Builds the error a failed set-up throws once its cleanup drop
 * has also failed. The set-up error stays first, so it is still the one to
 * read; the drop error rides along so a leaked database is never silent.
 */
function cleanupFailedError(
  name: string,
  setupError: unknown,
  dropError: unknown,
): AggregateError {
  const reason =
    setupError instanceof Error ? setupError.message : String(setupError);
  return new AggregateError(
    [setupError, dropError],
    `ot-telemetry DB tests: setting up "${name}" failed (${reason}), and dropping it again failed too — it may need dropping by hand.`,
  );
}

const SCRATCH_DATABASE_PREFIX = 'ot_telemetry_test_';

/**
 * @description How old a scratch database must be before a later run may
 * sweep it. Worktrees share the primary Postgres server, so a younger one may
 * belong to a run that is live right now. The longest legitimate lifetime is a
 * suite's `beforeAll` (120s) plus its tests, so two hours is a wide margin.
 */
const SCRATCH_DATABASE_TTL_SECONDS = 2 * 60 * 60;

/** `ot_telemetry_test_<unixSeconds>_<hex>` — the name carries its own age, since Postgres records none. */
const TIMESTAMPED_NAME = /^ot_telemetry_test_(\d+)_[0-9a-f]+$/;

/** `ot_telemetry_test_<hex>` — the pre-timestamp format, with no age to read. */
const LEGACY_NAME = /^ot_telemetry_test_[0-9a-f]+$/;

/** What a sweep does with one existing database. */
type SweepAction = 'drop' | 'drop-if-idle' | 'keep';

/**
 * @description Decides a database's fate from its name alone.
 *
 * A timestamped name older than {@link SCRATCH_DATABASE_TTL_SECONDS} is
 * dropped `WITH (FORCE)`: whatever run owned it is long dead.
 *
 * A legacy name is swept too, because nothing on this branch creates one any
 * more — but a worktree still on an older commit might, and it would be live.
 * So a legacy name is dropped without `FORCE`, which Postgres refuses while
 * anything is connected: an interrupted run's leftover goes, a live run's
 * database survives.
 */
function sweepActionFor(name: string, nowSeconds: number): SweepAction {
  const timestamped = TIMESTAMPED_NAME.exec(name);
  if (timestamped) {
    const createdAt = Number(timestamped[1]);
    const isStale = nowSeconds - createdAt > SCRATCH_DATABASE_TTL_SECONDS;
    return isStale ? 'drop' : 'keep';
  }
  return LEGACY_NAME.test(name) ? 'drop-if-idle' : 'keep';
}

/**
 * @description Drops the scratch databases interrupted runs left behind
 * (killed or timed-out Vitest processes never reach `afterAll`). Best-effort:
 * every failure is logged and swallowed, because a failed sweep must never
 * fail the run that happened to trigger it.
 */
async function sweepStaleScratchDatabases(
  admin: pg.Client,
  nowSeconds: number,
): Promise<void> {
  try {
    const result = await admin.query<{ datname: string }>(
      'SELECT datname FROM pg_database WHERE starts_with(datname, $1)',
      [SCRATCH_DATABASE_PREFIX],
    );
    const drops = result.rows.flatMap(({ datname }) => {
      const action = sweepActionFor(datname, nowSeconds);
      if (action === 'keep') return [];
      const force = action === 'drop' ? ' WITH (FORCE)' : '';
      return [
        admin
          .query(`DROP DATABASE IF EXISTS "${datname}"${force}`)
          .catch((error: unknown) => {
            console.warn(
              `ot-telemetry DB tests: could not sweep stale scratch database "${datname}" — leaving it.`,
              error,
            );
          }),
      ];
    });
    await Promise.all(drops);
  } catch (error) {
    console.warn(
      'ot-telemetry DB tests: sweeping stale scratch databases failed — carrying on.',
      error,
    );
  }
}

/**
 * @description Creates a uniquely-named, fully-migrated scratch database and
 * returns a pool connected to it.
 *
 * Sweeps stale leftovers from interrupted runs first
 * ({@link sweepStaleScratchDatabases}).
 *
 * Throws (it is a `beforeAll` helper, so the throw is the desired behavior).
 * Whatever fails after `CREATE DATABASE` drops the database again before the
 * error propagates: the caller never received a {@link ScratchDatabase.drop}
 * handle, so nothing else could.
 */
export async function createScratchDatabase(): Promise<ScratchDatabase> {
  const baseUrl = tryResolveBaseUrl();
  if (!baseUrl) {
    throw new Error(
      'ot-telemetry DB tests: could not resolve a Postgres connection string.',
    );
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const name = `${SCRATCH_DATABASE_PREFIX}${nowSeconds}_${randomBytes(6).toString('hex')}`;

  const admin = new pg.Client({ connectionString: baseUrl });
  await admin.connect();
  try {
    await sweepStaleScratchDatabases(admin, nowSeconds);
    await admin.query(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.end();
  }

  const scratchUrl = withDatabaseName(baseUrl, name);
  let pool: pg.Pool | undefined;
  try {
    await migrateScratchDatabase(scratchUrl);
    pool = new pg.Pool({ connectionString: scratchUrl });
  } catch (setupError) {
    try {
      // A pool that fails to close must not stop the drop; `FORCE` ends its
      // connections anyway.
      await pool?.end().catch(() => undefined);
      await dropScratchDatabase(baseUrl, name);
    } catch (dropError) {
      throw cleanupFailedError(name, setupError, dropError);
    }
    throw setupError;
  }

  const scratchPool = pool;
  return {
    async drop(): Promise<void> {
      await scratchPool.end();
      await dropScratchDatabase(baseUrl, name);
    },
    pool: scratchPool,
    sanitizedUrl: sanitizePostgresUrlForLogs(scratchUrl),
  };
}
