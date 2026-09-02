import { describe, expect, test } from 'vitest';

import { stableStringify, stableStringifyManifest } from '../stable-json';

/**
 * Determinism is the exporter's contract: a re-export against unchanged data
 * must be byte-identical, or the committed snapshot diff stops being reviewable.
 */
describe('stableStringify', () => {
  test('sorts object keys recursively', () => {
    // eslint-disable-next-line sort-keys, sort-keys-fix/sort-keys-fix -- unsorted input is the fixture
    expect(stableStringify({ b: { d: 1, c: 2 }, a: 3 })).toBe(
      '{"a":3,"b":{"c":2,"d":1}}',
    );
  });

  test('two key orders of the same object serialize identically', () => {
    expect(stableStringify({ x: 1, y: 2 })).toBe(
      // eslint-disable-next-line sort-keys, sort-keys-fix/sort-keys-fix -- unsorted input is the fixture
      stableStringify({ y: 2, x: 1 }),
    );
  });

  test('preserves array order', () => {
    expect(stableStringify({ list: [3, 1, 2] })).toBe('{"list":[3,1,2]}');
  });

  test('encodes Buffers as hex bytea markers', () => {
    expect(stableStringify(Buffer.from([0xde, 0xad]))).toBe(
      '{"$bytea":"dead"}',
    );
  });

  test('normalizes undefined to null and keeps null', () => {
    expect(stableStringify({ a: undefined, b: null })).toBe(
      '{"a":null,"b":null}',
    );
  });

  test('serializes Dates as ISO strings', () => {
    expect(stableStringify(new Date('2026-01-02T03:04:05.000Z'))).toBe(
      '"2026-01-02T03:04:05.000Z"',
    );
  });
});

/**
 * The manifest is the one part of the snapshot a human reads in a PR, and
 * lint-staged's Prettier pass rewrites `_tables.json` on commit. If the
 * exporter's output drifts from Prettier's shape, every refresh shows a
 * spurious one-line reformat — so the emitted form is pinned here.
 */
describe('stableStringifyManifest', () => {
  test('emits Prettier-shaped output with one inline entry per line', () => {
    expect(
      stableStringifyManifest([
        { rowCount: 31, table: 'daily_stats' },
        { rowCount: 4900, table: 'task_tags' },
      ]),
    ).toBe(
      [
        '{',
        '  "tables": [',
        '    { "rowCount": 31, "table": "daily_stats" },',
        '    { "rowCount": 4900, "table": "task_tags" }',
        '  ]',
        '}',
      ].join('\n'),
    );
  });

  test('sorts keys within an entry and preserves entry order', () => {
    expect(
      stableStringifyManifest([
        // eslint-disable-next-line sort-keys, sort-keys-fix/sort-keys-fix -- unsorted input is the fixture
        { table: 'b', rowCount: 2 },
        { rowCount: 1, table: 'a' },
      ]),
    ).toBe(
      '{\n  "tables": [\n    { "rowCount": 2, "table": "b" },\n    { "rowCount": 1, "table": "a" }\n  ]\n}',
    );
  });
});
