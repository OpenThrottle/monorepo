import { describe, expect, test } from 'vitest';

import {
  type AppliedMigration,
  createChecksum,
  filterSortSqlFiles,
  findChecksumDrift,
  isLedgerCutOver,
  type MigrationSource,
  type MigrationStore,
  RETIRED_MIGRATIONS,
  runMigrations,
  selectPendingMigrations,
} from '../../databases/migration-runner.ts';

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
    // Seeded rows carry a null checksum, exactly like legacy bootstrap-seeded ledger rows.
    for (const f of opts.seeded ?? []) this.ledger.set(f, null);
  }

  async ensureLedger(): Promise<void> {}

  async readApplied(): Promise<AppliedMigration[]> {
    return [...this.ledger].map(([filename, checksum]) => ({
      checksum,
      filename,
    }));
  }

  async coreTablesExist(): Promise<boolean> {
    return this.coreTables;
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

  test('isLedgerCutOver only when ledger empty AND schema present', () => {
    expect(isLedgerCutOver(0, true)).toBe(true);
    expect(isLedgerCutOver(0, false)).toBe(false);
    expect(isLedgerCutOver(5, true)).toBe(false);
  });

  test('createChecksum is deterministic and content-sensitive', () => {
    expect(createChecksum('SELECT 1')).toBe(createChecksum('SELECT 1'));
    expect(createChecksum('SELECT 1')).not.toBe(createChecksum('SELECT 2'));
  });
});

describe('runMigrations', () => {
  test('fresh DB applies every migration once, in order, recording checksums', async () => {
    const store = new FakeStore({ coreTables: false });
    const result = await runMigrations(store, source(FILES), () => {});

    expect(result.applied).toEqual(SORTED);
    expect(result.cutOver).toBe(false);
    expect(store.applyLog).toEqual(SORTED);
    for (const f of SORTED) {
      expect(store.ledger.get(f)).toBe(createChecksum(`-- sql for ${f}`));
    }
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

  test('cuts over a ledgerless populated DB by applying every file once and recording it', async () => {
    const store = new FakeStore({ coreTables: true });
    const logs: string[] = [];
    const result = await runMigrations(store, source(FILES), (m) =>
      logs.push(m),
    );

    expect(result.cutOver).toBe(true);
    expect(result.applied).toEqual(SORTED);
    // Every file actually runs: a file new in this image must never be marked
    // applied without executing, or an upgraded volume's schema falls behind.
    expect(store.applyLog).toEqual(SORTED);
    for (const f of SORTED) {
      expect(store.ledger.get(f)).toBe(createChecksum(`-- sql for ${f}`));
    }
    expect(logs.some((m) => m.includes('cut-over'))).toBe(true);

    store.applyLog.length = 0;
    const second = await runMigrations(store, source(FILES), () => {});
    expect(second.cutOver).toBe(false);
    expect(second.applied).toEqual([]);
    expect(store.applyLog).toEqual([]);
  });

  test('a non-empty ledger on a populated DB applies only the new file', async () => {
    const store = new FakeStore({
      coreTables: true,
      seeded: ['001_a.sql', '002_b.sql'],
    });
    const result = await runMigrations(store, source(FILES), () => {});

    expect(result.cutOver).toBe(false);
    expect(result.applied).toEqual(['003_c.sql']);
    expect(store.applyLog).toEqual(['003_c.sql']);
  });

  test('twice-in-a-row is a no-op (idempotent)', async () => {
    const store = new FakeStore({ coreTables: false });
    await runMigrations(store, source(FILES), () => {});
    store.applyLog.length = 0; // reset to observe the second run only

    const second = await runMigrations(store, source(FILES), () => {});
    expect(second.applied).toEqual([]);
    expect(store.applyLog).toEqual([]);
  });

  test.each([
    ['fresh', false],
    ['cut-over', true],
  ])(
    'a failing migration (%s) rolls back, records nothing, and is retried next run',
    async (_label, coreTables) => {
      const failing = new FakeStore({
        coreTables,
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
    },
  );
});

describe('findChecksumDrift', () => {
  const applied: AppliedMigration[] = [
    { checksum: 'aaa', filename: '001_a.sql' },
    { checksum: null, filename: '002_b.sql' }, // bootstrap-seeded → never drifts
    { checksum: 'ccc', filename: '003_c.sql' },
  ];

  test('flags only applied files whose current checksum differs', () => {
    const current = new Map([
      ['001_a.sql', 'aaa'], // unchanged
      ['002_b.sql', 'anything'], // null recorded → ignored
      ['003_c.sql', 'CHANGED'], // drift
    ]);
    expect(findChecksumDrift(applied, current)).toEqual([
      { applied: 'ccc', current: 'CHANGED', filename: '003_c.sql' },
    ]);
  });

  test('ignores files no longer present on disk', () => {
    expect(findChecksumDrift(applied, new Map([['001_a.sql', 'aaa']]))).toEqual(
      [],
    );
  });
});

describe('runMigrations checksum drift', () => {
  test('warns (does not fail or re-apply) when an applied file was edited', async () => {
    const store = new FakeStore({ coreTables: false });
    store.ledger.set('001_a.sql', 'stale-hash-from-before-the-edit');

    const warnings: string[] = [];
    await runMigrations(
      store,
      source(FILES),
      () => {},
      (m) => warnings.push(m),
    );

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('001_a.sql');
    // Drift never re-applies; only the genuinely-pending files run.
    expect(store.applyLog).toEqual(['002_b.sql', '003_c.sql']);
  });

  test('never warns about a retired migration whose body was replaced', async () => {
    const [retired] = [...RETIRED_MIGRATIONS];
    if (retired === undefined) throw new Error('expected a retired migration');

    const store = new FakeStore({ coreTables: false });
    store.ledger.set(retired, 'hash-of-the-original-body');

    const warnings: string[] = [];
    await runMigrations(
      store,
      source([retired]),
      () => {},
      (m) => warnings.push(m),
    );

    expect(warnings).toEqual([]);
    expect(store.applyLog).toEqual([]);
  });
});
