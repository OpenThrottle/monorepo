#!/usr/bin/env node

import { Client } from 'pg';
import {
  ensurePostgresReachable,
  getPostgresUrl,
} from '@openthrottle/openthrottle-agentic-utils';
import {
  createFsMigrationSource,
  PgMigrationStore,
  runMigrations,
} from './openthrottle-database-migrations';

/**
 * @description Dev/start Nx gate: ensures all pending SQL migrations are applied
 * against the SAME Postgres the server connects to, before openthrottle-server boots.
 *
 * Behaviour:
 *  1. Resolve the connection with {@link getPostgresUrl} (identical to the runner).
 *     The Nx `monorepo:ensure-migrations` target runs with `--env-file` pointing at
 *     the server's env, so gate and server hit the same DB (see Task: env/DB parity).
 *  2. Reachability preflight with bounded retry — covers the race where
 *     `pnpm run database:start` was just issued and the container isn't accepting
 *     connections yet.
 *  3. On reachable: delegate to the existing idempotent {@link runMigrations} runner
 *     (single source of truth — no second migration mechanism).
 *  4. On unreachable after the window: fail fast with actionable guidance and exit 1.
 *
 * The Docker path (Dockerfile.Migrations + compose `migrations` init service) stays
 * authoritative for container installs; this gate is dev/start-only.
 */

/** Number of reachability attempts before giving up (probe + retries). */
export const DEFAULT_ATTEMPTS = 10;

/** Delay between reachability attempts, in milliseconds (~5s total window). */
export const DEFAULT_DELAY_MS = 500;

/** Bounded-retry policy for the reachability preflight. */
export interface WaitOptions {
  /** Total attempts (clamped to >= 1). */
  attempts: number;
  /** Delay between attempts, in milliseconds. */
  delayMs: number;
}

/** Thrown when Postgres stays unreachable for the whole retry window. Message points at `database:start`. */
export class PostgresUnreachableError extends Error {
  constructor(
    readonly attempts: number,
    options?: { cause?: unknown },
  ) {
    super(
      `🔴 Postgres is not reachable after ${attempts} attempt(s) — start it with: pnpm run database:start`,
      options,
    );
    this.name = 'PostgresUnreachableError';
  }
}

/** Real-clock sleep; injectable so the retry policy is unit-testable without timers. */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll `probe` until it resolves or the attempt budget is exhausted, sleeping
 * `delayMs` between tries. Pure of pg/timers via injected `probe`/`sleepFn` so the
 * backoff policy can be exercised with fakes. Throws {@link PostgresUnreachableError}
 * (carrying the last failure as `cause`) once the budget runs out.
 */
export async function waitForReachable(
  probe: () => Promise<void>,
  sleepFn: (ms: number) => Promise<void>,
  options: WaitOptions,
): Promise<void> {
  const attempts = Math.max(1, options.attempts);
  let lastError: unknown;

  /* eslint-disable no-await-in-loop -- reachability retries are intentionally sequential */
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await probe();
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleepFn(options.delayMs);
      }
    }
  }
  /* eslint-enable no-await-in-loop */

  throw new PostgresUnreachableError(attempts, { cause: lastError });
}

/**
 * Wait for Postgres to become reachable, then run migrations. Reachability and the
 * migrate step are injected so both the retry policy and the runner wiring are
 * unit-testable with in-memory fakes (no pg, no real timers).
 */
export async function preflightAndMigrate(
  probe: () => Promise<void>,
  migrate: () => Promise<void>,
  sleepFn: (ms: number) => Promise<void>,
  options: WaitOptions,
): Promise<void> {
  await waitForReachable(probe, sleepFn, options);
  await migrate();
}

async function main(): Promise<void> {
  // Env/DB parity: the Nx target runs this with `--env-file applications/openthrottle-server/.env`,
  // the same file the server reads. getPostgresUrl() precedence is
  // OPENTHROTTLE_POSTGRES_URL → POSTGRES_URL → discrete POSTGRES_*; the server's TypeORM
  // datasource uses the discrete POSTGRES_* from that file. In that env file POSTGRES_URL and
  // the discrete vars are kept consistent (written together by setup), so gate and server hit the
  // same DB. The gate deliberately does NOT set a POSTGRES_HOST override (unlike root
  // `database:migrate`) — an override would be shadowed by POSTGRES_URL and could mask a mismatch.
  const connectionString = getPostgresUrl();
  const probe = (): Promise<void> => ensurePostgresReachable(connectionString);
  const migrate = async (): Promise<void> => {
    const client = new Client({ connectionString });
    await client.connect();
    try {
      await runMigrations(
        new PgMigrationStore(client),
        createFsMigrationSource(),
      );
    } finally {
      await client.end();
    }
  };

  try {
    await preflightAndMigrate(probe, migrate, sleep, {
      attempts: DEFAULT_ATTEMPTS,
      delayMs: DEFAULT_DELAY_MS,
    });
  } catch (error) {
    if (error instanceof PostgresUnreachableError) {
      console.error(error.message);
    } else {
      console.error(' 🔴  🔴  🔴 Migration gate failed:', error);
    }
    process.exit(1);
  }
}

// Only run when invoked directly (not when imported by tests).
if (process.argv[1] && process.argv[1].endsWith('ensure-migrations.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
