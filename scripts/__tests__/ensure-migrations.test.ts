import { describe, expect, test, vi } from 'vitest';
import {
  type AppliedMigration,
  type MigrationSource,
  type MigrationStore,
  runMigrations,
} from '../openthrottle-database-migrations';
import {
  DEFAULT_ATTEMPTS,
  PostgresUnreachableError,
  preflightAndMigrate,
  waitForReachable,
  type WaitOptions,
} from '../ensure-migrations';

const noSleep = async (): Promise<void> => {};

const opts = (attempts: number, delayMs = 1): WaitOptions => ({
  attempts,
  delayMs,
});

/** A probe that rejects its first `failures` calls, then resolves — models a DB coming up mid-window. */
const flakyProbe = (failures: number): (() => Promise<void>) => {
  let calls = 0;
  return async () => {
    calls += 1;
    if (calls <= failures) {
      throw new Error(`ECONNREFUSED #${calls}`);
    }
  };
};

/** In-memory {@link MigrationStore} recording applies — same shape as the runner's own test fake. */
class FakeStore implements MigrationStore {
  readonly ledger = new Map<string, string | null>();
  readonly applyLog: string[] = [];

  async ensureLedger(): Promise<void> {}

  async readApplied(): Promise<AppliedMigration[]> {
    return [...this.ledger].map(([filename, checksum]) => ({
      checksum,
      filename,
    }));
  }

  async coreTablesExist(): Promise<boolean> {
    return false;
  }

  async bootstrap(filenames: readonly string[]): Promise<void> {
    for (const f of filenames) this.ledger.set(f, null);
  }

  async apply(filename: string, _sql: string, checksum: string): Promise<void> {
    this.ledger.set(filename, checksum);
    this.applyLog.push(filename);
  }
}

const source = (files: string[]): MigrationSource => ({
  list: async () => [...files],
  read: async (f) => `-- sql for ${f}`,
});

const FILES = ['002_b.sql', '001_a.sql', 'README.md'];
const SORTED = ['001_a.sql', '002_b.sql'];

describe('waitForReachable', () => {
  test('returns after the first successful probe, without sleeping', async () => {
    const probe = vi.fn(async () => {});
    const sleep = vi.fn(noSleep);

    await waitForReachable(probe, sleep, opts(5));

    expect(probe).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  test('retries until a later probe succeeds, sleeping delayMs between attempts', async () => {
    const probe = vi.fn(flakyProbe(2)); // fail twice, succeed on the third
    const sleep = vi.fn(noSleep);

    await waitForReachable(probe, sleep, opts(5, 10));

    expect(probe).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2); // between attempts, never after the last
    expect(sleep).toHaveBeenCalledWith(10);
  });

  test('exhausts the budget and fails fast with database:start guidance', async () => {
    const probe = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });
    const sleep = vi.fn(noSleep);

    const error = await waitForReachable(probe, sleep, opts(3)).catch((e) => e);

    expect(error).toBeInstanceOf(PostgresUnreachableError);
    expect(error.message).toContain('pnpm run database:start');
    expect(error.attempts).toBe(3);
    expect(error.cause).toBeInstanceOf(Error); // last failure preserved
    expect(probe).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  test('clamps attempts to at least one', async () => {
    const probe = vi.fn(async () => {});

    await waitForReachable(probe, noSleep, opts(0));

    expect(probe).toHaveBeenCalledTimes(1);
  });
});

describe('preflightAndMigrate', () => {
  test('reachable on the first attempt → runs migrations exactly once', async () => {
    const store = new FakeStore();
    const migrate = vi.fn(async () => {
      await runMigrations(store, source(FILES), () => {});
    });

    await preflightAndMigrate(async () => {}, migrate, noSleep, opts(3));

    expect(migrate).toHaveBeenCalledTimes(1);
    // Runner wiring: only .sql files, applied in sorted order.
    expect(store.applyLog).toEqual(SORTED);
  });

  test('unreachable then reachable within the window → eventually migrates', async () => {
    const store = new FakeStore();
    const sleep = vi.fn(noSleep);
    const migrate = vi.fn(async () => {
      await runMigrations(store, source(FILES), () => {});
    });

    await preflightAndMigrate(flakyProbe(2), migrate, sleep, opts(5, 5));

    expect(sleep).toHaveBeenCalledTimes(2);
    expect(migrate).toHaveBeenCalledTimes(1);
    expect(store.applyLog).toEqual(SORTED);
  });

  test('never reachable within the budget → fails fast and never migrates', async () => {
    const store = new FakeStore();
    const migrate = vi.fn(async () => {
      await runMigrations(store, source(FILES), () => {});
    });

    const error = await preflightAndMigrate(
      async () => {
        throw new Error('down');
      },
      migrate,
      noSleep,
      opts(2),
    ).catch((e) => e);

    expect(error).toBeInstanceOf(PostgresUnreachableError);
    expect(error.message).toContain('pnpm run database:start');
    expect(migrate).not.toHaveBeenCalled();
    expect(store.applyLog).toEqual([]);
  });
});

describe('defaults', () => {
  test('DEFAULT_ATTEMPTS is a bounded, positive window', () => {
    expect(DEFAULT_ATTEMPTS).toBeGreaterThan(0);
  });
});
