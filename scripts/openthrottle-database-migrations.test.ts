import { describe, expect, test } from 'vitest';
import {
  createChecksum,
  filterSortSqlFiles,
  type MigrationSource,
  type MigrationStore,
  runMigrations,
  selectPendingMigrations,
  shouldBootstrapLedger,
} from './openthrottle-database-migrations';

/** In-memory {@link MigrationStore} recording applies; can simulate a failing migration. */
class FakeStore implements MigrationStore {
  readonly ledger = new Map<string, string | null>();
  readonly applyLog: string[] = [];
  coreTables: boolean;
  failOn: Set<string>;

  constructor(
    opts: {
      coreTables?: boolean;
      failOn?: Set<string>;
      seeded?: readonly string[];
    } = {},
  ) {
    this.coreTables = opts.coreTables ?? false;
    this.failOn = opts.failOn ?? new Set();
    for (const f of opts.seeded ?? []) this.ledger.set(f, 'seed');
  }

  async ensureLedger(): Promise<void> {}

  async readApplied(): Promise<string[]> {
    return [...this.ledger.keys()];
  }

  async coreTablesExist(): Promise<boolean> {
    return this.coreTables;
  }

  async bootstrap(filenames: readonly string[]): Promise<void> {
    for (const f of filenames) this.ledger.set(f, null);
  }

  async apply(filename: string, sql: string, checksum: string): Promise<void> {
    // A real transaction records nothing on failure — model that by throwing first.
    if (this.failOn.has(filename)) {
      throw new Error(`boom: ${filename} (${sql.length} bytes)`);
    }
    this.ledger.set(filename, checksum);
    this.applyLog.push(filename);
  }
}

const source = (files: string[]): MigrationSource => ({
  list: async () => [...files],
  read: async (f) => `-- sql for ${f}`,
});

const FILES = ['003_c.sql', '001_a.sql', '002_b.sql', 'README.md'];
const SORTED = ['001_a.sql', '002_b.sql', '003_c.sql'];

describe('pure helpers', () => {
  test('filterSortSqlFiles keeps only .sql, sorted', () => {
    expect(filterSortSqlFiles(FILES)).toEqual(SORTED);
  });

  test('selectPendingMigrations returns unapplied in sorted order', () => {
    expect(selectPendingMigrations(FILES, ['001_a.sql'])).toEqual([
      '002_b.sql',
      '003_c.sql',
    ]);
    expect(selectPendingMigrations(FILES, SORTED)).toEqual([]);
  });

  test('shouldBootstrapLedger only when ledger empty AND schema present', () => {
    expect(shouldBootstrapLedger(0, true)).toBe(true);
    expect(shouldBootstrapLedger(0, false)).toBe(false);
    expect(shouldBootstrapLedger(5, true)).toBe(false);
  });

  test('createChecksum is deterministic and content-sensitive', () => {
    expect(createChecksum('SELECT 1')).toBe(createChecksum('SELECT 1'));
    expect(createChecksum('SELECT 1')).not.toBe(createChecksum('SELECT 2'));
  });
});

describe('runMigrations', () => {
  test('fresh DB applies every migration once, in order', async () => {
    const store = new FakeStore({ coreTables: false });
    const result = await runMigrations(store, source(FILES), () => {});

    expect(result.applied).toEqual(SORTED);
    expect(result.bootstrapped).toBe(false);
    expect(store.applyLog).toEqual(SORTED);
  });

  test('skips already-applied and applies only new files', async () => {
    const store = new FakeStore({
      coreTables: false,
      seeded: ['001_a.sql', '002_b.sql'],
    });
    const result = await runMigrations(store, source(FILES), () => {});

    expect(result.applied).toEqual(['003_c.sql']);
    expect(store.applyLog).toEqual(['003_c.sql']);
  });

  test('bootstraps an existing populated DB without running any migration', async () => {
    const store = new FakeStore({ coreTables: true });
    const result = await runMigrations(store, source(FILES), () => {});

    expect(result.bootstrapped).toBe(true);
    expect(result.applied).toEqual([]);
    expect(store.applyLog).toEqual([]); // no SQL executed
    expect(new Set(store.ledger.keys())).toEqual(new Set(SORTED)); // all recorded
  });

  test('twice-in-a-row is a no-op (idempotent)', async () => {
    const store = new FakeStore({ coreTables: false });
    await runMigrations(store, source(FILES), () => {});
    store.applyLog.length = 0; // reset to observe the second run only

    const second = await runMigrations(store, source(FILES), () => {});
    expect(second.applied).toEqual([]);
    expect(store.applyLog).toEqual([]);
  });

  test('a failing migration rolls back, records nothing, and is retried next run', async () => {
    const failing = new FakeStore({
      coreTables: false,
      failOn: new Set(['002_b.sql']),
    });

    await expect(
      runMigrations(failing, source(FILES), () => {}),
    ).rejects.toThrow('boom: 002_b.sql');

    // 001 applied; 002 failed (not recorded); 003 never attempted.
    expect(failing.applyLog).toEqual(['001_a.sql']);
    expect([...failing.ledger.keys()]).toEqual(['001_a.sql']);

    // Simulate the fix landing: next run retries 002 and continues.
    failing.failOn = new Set();
    const retry = await runMigrations(failing, source(FILES), () => {});
    expect(retry.applied).toEqual(['002_b.sql', '003_c.sql']);
  });
});
