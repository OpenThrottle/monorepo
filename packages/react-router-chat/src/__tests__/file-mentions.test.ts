import { describe, expect, test } from 'vitest';
import {
  detectActiveMention,
  FILE_MENTION_TRIGGER,
  insertFileMention,
  parseFileMentions,
} from '../file-mentions';

describe('parseFileMentions', () => {
  test('exposes the @ trigger marker', () => {
    expect(FILE_MENTION_TRIGGER).toBe('@');
  });

  test('returns no mentions for an empty or mention-free message', () => {
    expect(parseFileMentions('')).toEqual([]);
    expect(parseFileMentions('just some plain prose')).toEqual([]);
  });

  test('extracts a single mention at the start of the message', () => {
    expect(parseFileMentions('@src/app/root.tsx please look')).toEqual([
      { path: 'src/app/root.tsx' },
    ]);
  });

  test('extracts multiple mentions in order', () => {
    expect(parseFileMentions('compare @src/a.ts with @lib/b.ts today')).toEqual(
      [{ path: 'src/a.ts' }, { path: 'lib/b.ts' }],
    );
  });

  test('collapses duplicate paths to the first occurrence, preserving order', () => {
    expect(
      parseFileMentions('@src/a.ts and again @src/a.ts then @z/c.ts'),
    ).toEqual([{ path: 'src/a.ts' }, { path: 'z/c.ts' }]);
  });

  test('strips trailing sentence punctuation but keeps internal dots', () => {
    expect(parseFileMentions('see @src/app.ts.')).toEqual([
      { path: 'src/app.ts' },
    ]);
    expect(parseFileMentions('files @a/b.ts, @c/d.ts;')).toEqual([
      { path: 'a/b.ts' },
      { path: 'c/d.ts' },
    ]);
    expect(parseFileMentions('wrapped (@src/app.ts) here')).toEqual([
      { path: 'src/app.ts' },
    ]);
  });

  test('stops a token at whitespace (spaces in paths not supported in v1)', () => {
    // The path segment before the space is captured; the remainder is prose.
    expect(parseFileMentions('open @dir/a b.ts now')).toEqual([
      { path: 'dir/a' },
    ]);
  });

  test('does not treat an email local-part as a mention', () => {
    expect(parseFileMentions('email me at user@example.com anytime')).toEqual(
      [],
    );
  });

  test('ignores an @ that is not followed by a path', () => {
    expect(parseFileMentions('a lone @ here')).toEqual([]);
    expect(parseFileMentions('trailing marker @')).toEqual([]);
    expect(parseFileMentions('@ leading space')).toEqual([]);
  });

  test('extracts a mention across newlines', () => {
    expect(parseFileMentions('line one\n@src/two.ts\nline three')).toEqual([
      { path: 'src/two.ts' },
    ]);
  });
});

describe('detectActiveMention', () => {
  test('detects a mention with the caret at the end of the query', () => {
    const value = 'look at @src/ap';
    expect(detectActiveMention(value, value.length)).toEqual({
      anchor: 8,
      query: 'src/ap',
    });
  });

  test('detects an empty query right after a bare @', () => {
    expect(detectActiveMention('hi @', 4)).toEqual({ anchor: 3, query: '' });
  });

  test('reads the query only up to the caret, not the whole token', () => {
    const value = 'go @src/app.ts';
    expect(detectActiveMention(value, 6)).toEqual({ anchor: 3, query: 'sr' });
  });

  test('returns null once a space follows the @ before the caret', () => {
    expect(detectActiveMention('@src/a done', 11)).toBeNull();
  });

  test('returns null for an email local-part', () => {
    const value = 'user@example';
    expect(detectActiveMention(value, value.length)).toBeNull();
  });

  test('returns null when the caret is not after any @', () => {
    expect(detectActiveMention('plain text', 5)).toBeNull();
  });

  test('opens a mention after an opening delimiter', () => {
    const value = '(@lib/x';
    expect(detectActiveMention(value, value.length)).toEqual({
      anchor: 1,
      query: 'lib/x',
    });
  });
});

describe('insertFileMention', () => {
  test('replaces the @query with the @path token plus a trailing space', () => {
    // 'go @src/ap' with caret after 'ap' (index 10), choosing src/app.ts
    const result = insertFileMention('go @src/ap', 3, 10, 'src/app.ts');
    expect(result.value).toBe('go @src/app.ts ');
    expect(result.caret).toBe(result.value.length);
  });

  test('preserves text after the caret and lands the caret after the space', () => {
    // 'a @sr rest' with the mention query 'sr' spanning [2,5)
    const result = insertFileMention('a @sr rest', 2, 5, 'src/b.ts');
    expect(result.value).toBe('a @src/b.ts  rest');
    expect(result.caret).toBe('a @src/b.ts '.length);
  });
});
