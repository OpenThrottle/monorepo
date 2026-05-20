import { describe, expect, test } from 'vitest';
import { readStorageEntries, summarizeStoragePair } from '../settings.debug';

describe('settings.debug', () => {
  describe('summarizeStoragePair', () => {
    test('masks token-like storage keys', () => {
      expect(summarizeStoragePair('auth_token', 'secret-value-here')).toContain(
        'masked',
      );
    });

    test('truncates long values', () => {
      const long = 'x'.repeat(200);
      const preview = summarizeStoragePair('note', long);
      expect(preview.endsWith('…')).toBe(true);
      expect(preview.length).toBeLessThan(long.length);
    });

    test('returns short values unchanged when not sensitive', () => {
      expect(summarizeStoragePair('theme', 'dark')).toBe('dark');
    });
  });

  describe('readStorageEntries', () => {
    test('returns sorted key previews from storage', () => {
      const storage = {
        getItem: (key: string) =>
          key === 'b-key' ? 'two' : key === 'a-key' ? 'one' : null,
        key: (index: number) => (index === 0 ? 'b-key' : 'a-key'),
        length: 2,
      } as Storage;

      expect(readStorageEntries(storage)).toStrictEqual([
        { key: 'a-key', preview: 'one' },
        { key: 'b-key', preview: 'two' },
      ]);
    });

    test('returns empty list when storage is unavailable', () => {
      expect(readStorageEntries(undefined)).toStrictEqual([]);
    });
  });
});
