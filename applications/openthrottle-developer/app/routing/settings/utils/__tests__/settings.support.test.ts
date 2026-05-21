import { describe, expect, test, vi } from 'vitest';
import type { ClientLogEntry } from '~/routing/settings/client-log-sink';
import {
  copyText,
  entryToJsonRecord,
  formatEntryLine,
  getEmptyServerSnapshot,
} from '../settings.support';

describe('settings.support', () => {
  test('getEmptyServerSnapshot returns an empty array', () => {
    expect(getEmptyServerSnapshot()).toStrictEqual([]);
  });

  test('formatEntryLine includes ISO time, level, and message', () => {
    const entry: ClientLogEntry = {
      level: 'info',
      message: 'hello',
      t: Date.UTC(2024, 5, 15, 12, 0, 0),
    };
    const line = formatEntryLine(entry);
    expect(line).toContain('[info]');
    expect(line).toContain('hello');
    expect(line).toMatch(/2024/);
  });

  test('entryToJsonRecord maps log fields for JSON export', () => {
    const entry: ClientLogEntry = {
      level: 'warn',
      message: 'careful',
      t: 1_700_000_000_000,
    };
    expect(entryToJsonRecord(entry)).toStrictEqual({
      isoTime: new Date(entry.t).toISOString(),
      level: 'warn',
      message: 'careful',
      t: entry.t,
    });
  });

  describe('copyText', () => {
    test('returns true when clipboard write succeeds', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      await expect(copyText('payload')).resolves.toBe(true);
      expect(writeText).toHaveBeenCalledWith('payload');
    });

    test('returns false when clipboard write fails', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'));
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      await expect(copyText('payload')).resolves.toBe(false);
    });
  });
});
