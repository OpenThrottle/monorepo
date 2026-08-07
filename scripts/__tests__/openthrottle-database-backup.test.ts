import { describe, expect, test } from 'vitest';
import {
  resolveBackupRetentionCount,
  selectBackupsToPrune,
} from '../openthrottle-database-backup';

const ARCHIVES = [
  'openthrottle-20260101-000000.zip',
  'openthrottle-20260102-000000.zip',
  'openthrottle-20260103-000000.zip',
];

const NON_ARCHIVES = [
  'seed.sql',
  'seed_v0.sql',
  'notes.txt',
  'openthrottle.zip',
];

describe('selectBackupsToPrune', () => {
  test('keeps the N most recent archives and returns the rest to delete', () => {
    const toDelete = selectBackupsToPrune([...ARCHIVES, ...NON_ARCHIVES], 2);

    expect(toDelete).toEqual(['openthrottle-20260101-000000.zip']);
  });

  test('never selects seed files or non-archive files', () => {
    const toDelete = selectBackupsToPrune([...ARCHIVES, ...NON_ARCHIVES], 0);

    for (const name of NON_ARCHIVES) {
      expect(toDelete).not.toContain(name);
    }
    // keep <= 0 prunes every archive (but still nothing else).
    expect(toDelete).toHaveLength(ARCHIVES.length);
  });

  test('returns nothing when the count is within the retention window', () => {
    expect(selectBackupsToPrune(ARCHIVES, 5)).toEqual([]);
  });
});

describe('resolveBackupRetentionCount', () => {
  test('defaults to 14 when unset, blank, or invalid', () => {
    expect(resolveBackupRetentionCount(undefined)).toBe(14);
    expect(resolveBackupRetentionCount('')).toBe(14);
    expect(resolveBackupRetentionCount('abc')).toBe(14);
    expect(resolveBackupRetentionCount('0')).toBe(14);
    expect(resolveBackupRetentionCount('-3')).toBe(14);
  });

  test('parses a positive integer', () => {
    expect(resolveBackupRetentionCount('7')).toBe(7);
    expect(resolveBackupRetentionCount(' 30 ')).toBe(30);
  });
});
