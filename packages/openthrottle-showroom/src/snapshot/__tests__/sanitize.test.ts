import { describe, expect, test } from 'vitest';

import type { SnapshotManifest } from '../manifest';
import type { SanitizeContext } from '../sanitize';
import {
  createSanitizer,
  detectSecret,
  parsePostgresTimestamp,
  scrubEmail,
  scrubIdentity,
} from '../sanitize';
import type { DatabaseSchema, TableSchema } from '../schema';

describe('scrubIdentity', () => {
  test('rewrites real emails onto the demo domain deterministically', () => {
    const once = scrubIdentity('signed in as someone@example-company.com');
    const twice = scrubIdentity('signed in as someone@example-company.com');

    expect(once).toBe(twice);
    expect(once).toMatch(/someone-[0-9a-f]{6}@atlasworks\.example/);
    expect(once).not.toContain('example-company.com');
  });

  test('two distinct real addresses never collide after scrubbing', () => {
    expect(scrubEmail('dev@one.example.com')).not.toBe(
      scrubEmail('dev@two.example.com'),
    );
  });

  test('leaves demo-domain addresses alone', () => {
    expect(scrubIdentity('ada@atlasworks.example')).toBe(
      'ada@atlasworks.example',
    );
  });

  test('collapses home directories but keeps the rest of the path', () => {
    expect(
      scrubIdentity('built at /Users/someone/Development/openthrottle/dist'),
    ).toBe('built at /home/demo/Development/openthrottle/dist');
    expect(scrubIdentity('log in /home/ci-runner/logs')).toBe(
      'log in /home/demo/logs',
    );
  });

  test('collapses .local hostnames to the demo hostname', () => {
    expect(scrubIdentity('ran on Someones-MacBook-Pro-2.local overnight')).toBe(
      'ran on demo-workstation.local overnight',
    );
  });

  test('keeps GitHub usernames and repository names', () => {
    const text = 'opened by visormatt in OpenThrottle/monorepo';

    expect(scrubIdentity(text)).toBe(text);
  });
});

describe('detectSecret', () => {
  test.each([
    ['aws-access-key', 'key AKIAIOSFODNN7EXAMPLE in config'],
    ['github-token', 'ghp_abcdefghijklmnopqrstuvwx123456 pushed'],
    ['provider-key', 'sk-ant-api03-abcdefghijklmnopqrst set'],
    [
      'jwt',
      'bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQss',
    ],
    ['private-key-block', '-----BEGIN RSA PRIVATE KEY-----'],
    [
      'connection-string-password',
      'postgres://admin:hunter2@db.internal:5432/prod',
    ],
  ])('flags %s', (rule, text) => {
    expect(detectSecret(text)).toContain(rule);
  });

  test.each([
    [
      'a docs placeholder password',
      'postgresql://openthrottle_user:openthrottle_password@localhost:6010/openthrottle',
    ],
    [
      'a template placeholder password',
      'postgresql://{{username}}:{{password}}@localhost:5432/postgres',
    ],
  ])('does not flag a connection string with %s', (_label, text) => {
    expect(detectSecret(text)).toBeNull();
  });

  test('flags long mixed-class strings via the entropy heuristic', () => {
    expect(
      detectSecret('token aB3dE5fG7hJ9kL1mN3pQ5rS7tU9vW1xY3zA5bC7d here'),
    ).toContain('high-entropy-string');
  });

  test.each([
    ['a git SHA', 'commit 4548e987aa4548e987aa4548e987aa4548e987aa landed'],
    ['a UUID', 'plan 050c43a1-8b00-485d-adce-86bda5bb7a19 done'],
    [
      'a lockfile integrity hash',
      'integrity sha512-AbCdEf0123456789AbCdEf0123456789AbCdEf01 unchanged',
    ],
    ['ordinary prose', 'the quick brown fox jumps over the lazy dog'],
  ])('does not flag %s', (_label, text) => {
    expect(detectSecret(text)).toBeNull();
  });
});

const isOffsetMarker = (value: unknown): value is { $offsetMs: number } =>
  typeof value === 'object' && value !== null && '$offsetMs' in value;

const offsetMsOf = (value: unknown): number => {
  if (!isOffsetMarker(value)) {
    throw new Error('expected an $offsetMs marker');
  }

  return value.$offsetMs;
};

const schema: DatabaseSchema = {
  foreignKeys: [],
  tables: new Map<string, TableSchema>([
    [
      'plan_output_stream',
      {
        columnTypes: {
          content: 'text',
          created_at: 'timestamp with time zone',
          id: 'integer',
          plan_id: 'uuid',
        },
        columns: ['id', 'plan_id', 'content', 'created_at'],
        name: 'plan_output_stream',
        primaryKey: ['id'],
      },
    ],
    [
      'users',
      {
        columnTypes: {
          email: 'text',
          id: 'uuid',
          joined_on: 'date',
          password_hash: 'text',
          updated_at: 'timestamp with time zone',
        },
        columns: ['id', 'email', 'password_hash', 'updated_at', 'joined_on'],
        name: 'users',
        primaryKey: ['id'],
      },
    ],
  ]),
  uniqueKeys: [],
};

const manifest: SnapshotManifest = {
  plan_output_stream: {
    classification: 'exported',
    columns: {
      content: { action: 'scrub', reason: 'free text' },
      created_at: { action: 'keep', reason: 'timestamp' },
      id: { action: 'keep', reason: 'identifier' },
      plan_id: { action: 'keep', reason: 'identifier' },
    },
    reason: 'test fixture',
  },
  users: {
    classification: 'exported',
    columns: {
      email: { action: 'scrub', reason: 'identity' },
      id: { action: 'keep', reason: 'identifier' },
      joined_on: { action: 'keep', reason: 'date' },
      password_hash: { action: 'drop', reason: 'credential' },
      updated_at: { action: 'keep', reason: 'timestamp' },
    },
    reason: 'test fixture',
  },
};

const context: SanitizeContext = {
  anchorIso: '2026-08-27 12:00:00+00',
  manifest,
  schema,
};

describe('createSanitizer', () => {
  test('drops credential columns and scrubs identity columns', () => {
    const sanitize = createSanitizer(context);
    const row = sanitize('users', {
      email: 'someone@example-company.com',
      id: 'u1',
      joined_on: '2026-08-20',
      password_hash: '$argon2id$v=19$deadbeef',
      updated_at: '2026-08-27 11:00:00+00',
    });

    expect(row?.password_hash).toBeNull();
    expect(String(row?.email)).toMatch(/@atlasworks\.example$/);
    expect(row?.updated_at).toEqual({ $offsetMs: -3_600_000 });
    expect(row?.joined_on).toEqual({ $offsetDays: -7 });
  });

  test('a secret in a kept row STOPS the export naming table, column and row id', () => {
    const sanitize = createSanitizer(context);

    expect(() =>
      sanitize('plan_output_stream', {
        content: 'exported AKIAIOSFODNN7EXAMPLE to prod',
        created_at: '2026-08-27 11:59:00+00',
        id: 42,
        plan_id: 'p1',
      }),
    ).toThrow(/'plan_output_stream\.content' \(row 42\): aws-access-key/);
  });

  test('rebase preserves relative ordering exactly (property over a scrambled series)', () => {
    const sanitize = createSanitizer(context);
    // Deterministic pseudo-random offsets: minutes scattered around the anchor.
    const minutes = Array.from({ length: 200 }, (_, i) => (i * 37) % 1_440);
    const inputs = minutes.map((minute, i) => ({
      minute,
      row: {
        email: null,
        id: `u${i}`,
        joined_on: null,
        password_hash: null,
        updated_at: `2026-08-26 ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00+00`,
      },
    }));

    const offsets = inputs.map(({ row }) =>
      offsetMsOf(sanitize('users', row)?.updated_at),
    );

    for (let i = 0; i < inputs.length; i += 1) {
      for (let j = 0; j < inputs.length; j += 1) {
        const inputOrder = Math.sign(inputs[i].minute - inputs[j].minute);
        const outputOrder = Math.sign(offsets[i] - offsets[j]);

        expect(outputOrder).toBe(inputOrder);
      }
    }
  });

  test('plan_output_stream offsets are strictly increasing and unique per plan', () => {
    const sanitize = createSanitizer(context);
    const rows = [
      {
        content: 'a',
        created_at: '2026-08-27 11:00:00+00',
        id: 1,
        plan_id: 'p1',
      },
      {
        content: 'b',
        created_at: '2026-08-27 11:00:00+00',
        id: 2,
        plan_id: 'p1',
      },
      {
        content: 'c',
        created_at: '2026-08-27 11:00:00+00',
        id: 3,
        plan_id: 'p2',
      },
      {
        content: 'd',
        created_at: '2026-08-27 11:00:01+00',
        id: 4,
        plan_id: 'p1',
      },
    ];

    const offsets = rows.map((row) => {
      const sanitized = sanitize('plan_output_stream', row);

      return {
        offset: offsetMsOf(sanitized?.created_at),
        planId: row.plan_id,
      };
    });

    const p1 = offsets.filter((entry) => entry.planId === 'p1');

    expect(p1[1].offset).toBeGreaterThan(p1[0].offset);
    expect(p1[2].offset).toBeGreaterThan(p1[1].offset);
    // p2 is untouched by p1's bumping.
    expect(offsets[2].offset).toBe(offsets[0].offset);
  });
});

describe('parsePostgresTimestamp', () => {
  test('parses raw Postgres text timestamps with and without zone', () => {
    expect(parsePostgresTimestamp('2026-08-27 12:00:00+00')).toBe(
      Date.parse('2026-08-27T12:00:00Z'),
    );
    expect(parsePostgresTimestamp('2026-08-27 12:00:00.123456+00')).toBe(
      Date.parse('2026-08-27T12:00:00.123Z'),
    );
    expect(parsePostgresTimestamp('2026-08-20')).toBe(
      Date.parse('2026-08-20T00:00:00Z'),
    );
  });

  test('fails loudly on garbage', () => {
    expect(() => parsePostgresTimestamp('not-a-time')).toThrow(/unparseable/);
  });
});
