import { randomBytes } from 'node:crypto';

import {
  getPostgresUrl,
  OPENTHROTTLE_POSTGRES_URL_ENV,
} from '@openthrottle/openthrottle-agentic-utils';
import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createScratchDatabase,
  isLocalPostgresReachable,
} from '../scratch-database.ts';

/**
 * @description Exercises the scratch-database helper's own teardown against a
 * real Postgres. The migrations subprocess is replaced by a stub that fails, so
 * every test here runs the "set-up failed after `CREATE DATABASE`" path in
 * milliseconds rather than paying for a full migration run. The stub records
 * the connection string it was handed, which names the database it would have
 * migrated: that is how a test learns the generated name.
 */

const MIGRATION_ERROR = new Error('stub: the migrations runner failed');

const migrationCalls = vi.hoisted(() => {
  const urls: string[] = [];
  return { urls };
});

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFile: (...args: unknown[]): void => {
      const options = args[2];
      if (typeof options === 'object' && options !== null && 'env' in options) {
        const env = options.env;
        if (typeof env === 'object' && env !== null) {
          const url = Reflect.get(env, OPENTHROTTLE_POSTGRES_URL_ENV);
          if (typeof url === 'string') migrationCalls.urls.push(url);
        }
      }
      const callback = args.at(-1);
      if (typeof callback === 'function') callback(MIGRATION_ERROR);
    },
  };
});

/** Runs one statement on the server's admin connection. */
const adminQuery = async (
  text: string,
  values: readonly unknown[] = [],
): Promise<pg.QueryResult> => {
  const client = new pg.Client({
    connectionString: getPostgresUrl(process.env),
  });
  await client.connect();
  try {
    return await client.query(text, [...values]);
  } finally {
    await client.end();
  }
};

/** Whether a database of this exact name exists on the server right now. */
const databaseExists = async (name: string): Promise<boolean> => {
  const result = await adminQuery(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [name],
  );
  return result.rowCount === 1;
};

/** A unique hex suffix, so planted names never collide with a real run's. */
const hexSuffix = (): string => {
  return randomBytes(6).toString('hex');
};

/**
 * @description Unix seconds, `secondsAgo` in the past, on the REAL clock.
 * Planted names have to be dated against it: every run sharing this Postgres
 * server sweeps by real time, so a name dated from a faked clock could be
 * swept by a concurrent run in another worktree mid-test.
 */
const unixSecondsAgo = (secondsAgo: number): number => {
  // eslint-disable-next-line openthrottle/no-wall-clock-in-tests -- the sweep under test reads the real clock, and so do concurrent runs on the shared server (see JSDoc).
  return Math.floor(Date.now() / 1000) - secondsAgo;
};

/** The admin connection string, pointed at another database on the same server. */
const databaseUrl = (name: string): string => {
  const url = new URL(getPostgresUrl(process.env));
  url.pathname = `/${name}`;
  return url.toString();
};

/** The database name a recorded connection string points at. */
const databaseNameOf = (connectionString: string): string => {
  return new URL(connectionString).pathname.slice(1);
};

const reachable = await isLocalPostgresReachable();

describe.runIf(reachable)('createScratchDatabase', () => {
  beforeEach(() => {
    migrationCalls.urls.length = 0;
  });

  describe('when the migration fails', () => {
    it('rethrows the original migration error', async () => {
      await expect(createScratchDatabase()).rejects.toBe(MIGRATION_ERROR);
    });

    it('leaves no scratch database behind', async () => {
      await createScratchDatabase().catch(() => undefined);

      const [url] = migrationCalls.urls;
      expect(url).toBeDefined();
      const name = databaseNameOf(url ?? '');
      expect(name).toMatch(/^ot_telemetry_test_\d+_[0-9a-f]+$/);
      expect(await databaseExists(name)).toBe(false);
    });
  });

  describe('when earlier runs left scratch databases behind', () => {
    const THREE_HOURS = 3 * 60 * 60;
    const stale = `ot_telemetry_test_${unixSecondsAgo(THREE_HOURS)}_${hexSuffix()}`;
    const fresh = `ot_telemetry_test_${unixSecondsAgo(60)}_${hexSuffix()}`;
    const legacy = `ot_telemetry_test_${hexSuffix()}`;
    const planted = [stale, fresh, legacy];

    beforeEach(async () => {
      await Promise.all(
        planted.map((name) => {
          return adminQuery(`CREATE DATABASE "${name}"`);
        }),
      );
    });

    afterEach(async () => {
      await Promise.all(
        planted.map((name) => {
          return adminQuery(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        }),
      );
    });

    it('sweeps a timestamped database older than the TTL', async () => {
      await createScratchDatabase().catch(() => undefined);

      expect(await databaseExists(stale)).toBe(false);
    });

    it('never touches a timestamped database inside the TTL', async () => {
      await createScratchDatabase().catch(() => undefined);

      expect(await databaseExists(fresh)).toBe(true);
    });

    it('sweeps an idle legacy (untimestamped) database', async () => {
      await createScratchDatabase().catch(() => undefined);

      expect(await databaseExists(legacy)).toBe(false);
    });

    it('keeps a legacy database something is still connected to', async () => {
      const holder = new pg.Client({
        connectionString: databaseUrl(legacy),
      });
      await holder.connect();
      try {
        await createScratchDatabase().catch(() => undefined);

        expect(await databaseExists(legacy)).toBe(true);
      } finally {
        await holder.end();
      }
    });
  });
});
