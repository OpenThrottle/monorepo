import { describe, expect, test } from 'vitest';
import { FILE_MENTION_TRIGGER, parseFileMentions } from '../file-mentions';

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
