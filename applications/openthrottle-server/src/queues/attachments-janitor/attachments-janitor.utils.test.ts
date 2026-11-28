import { describe, expect, it } from 'vitest';

import {
  chunkList,
  classifyEntryName,
  isOlderThan,
  mayReapAttachmentFiles,
  parseRetentionDays,
  retentionDaysToMs,
} from './attachments-janitor.utils.ts';

const SHA = 'a'.repeat(64);

describe('parseRetentionDays', () => {
  it.each([undefined, '', '  ', 'abc', '0', '-5', 'Infinity', 'NaN'])(
    'falls back to 30 for %s',
    (raw) => {
      expect(parseRetentionDays(raw)).toBe(30);
    },
  );

  it('reads a positive number', () => {
    expect(parseRetentionDays(' 7 ')).toBe(7);
  });

  it('accepts a fractional number of days', () => {
    expect(parseRetentionDays('0.5')).toBe(0.5);
  });
});

describe('retentionDaysToMs', () => {
  it('converts days to milliseconds', () => {
    expect(retentionDaysToMs(2)).toBe(2 * 24 * 60 * 60 * 1000);
  });
});

describe('classifyEntryName', () => {
  it.each(['png', 'jpg', 'gif', 'webp'])('accepts a .%s attachment', (ext) => {
    expect(classifyEntryName(`${SHA}.${ext}`)).toStrictEqual({
      kind: 'attachment',
      sha256: SHA,
    });
  });

  it('flags a temp file', () => {
    expect(classifyEntryName('.tmp-1234')).toStrictEqual({ kind: 'temp' });
  });

  it('flags a turn staging directory', () => {
    expect(classifyEntryName('.turn-Ab12Cd')).toStrictEqual({ kind: 'turn' });
  });

  it.each([
    `${SHA}.txt`,
    `${SHA}.jpeg`,
    `${'a'.repeat(63)}.png`,
    `${'A'.repeat(64)}.png`,
    `${SHA}.png.bak`,
    `x${SHA}.png`,
    'notes.md',
    '.DS_Store',
  ])('ignores %s', (name) => {
    expect(classifyEntryName(name)).toStrictEqual({ kind: 'ignored' });
  });
});

describe('isOlderThan', () => {
  it('is true past the age', () => {
    expect(isOlderThan(0, 1001, 1000)).toBe(true);
  });

  it('is false at exactly the age', () => {
    expect(isOlderThan(0, 1000, 1000)).toBe(false);
  });

  it('is false for a future mtime', () => {
    expect(isOlderThan(5000, 1000, 1000)).toBe(false);
  });
});

describe('chunkList', () => {
  it('splits with a short tail', () => {
    expect(chunkList([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
  });

  it('returns no chunks for an empty list', () => {
    expect(chunkList([], 3)).toStrictEqual([]);
  });

  it('treats a non-positive size as one', () => {
    expect(chunkList([1, 2], 0)).toStrictEqual([[1], [2]]);
  });
});

describe('mayReapAttachmentFiles', () => {
  it.each([undefined, '', '  '])(
    'allows a non-worktree checkout (%s)',
    (raw) => {
      expect(mayReapAttachmentFiles(raw)).toBe(true);
    },
  );

  it.each(['isolated', 'shared'])('refuses a %s worktree', (raw) => {
    expect(mayReapAttachmentFiles(raw)).toBe(false);
  });
});
