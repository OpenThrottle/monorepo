import { describe, expect, it } from 'vitest';
import { parseFileMentionsField } from '~/routing/home/utils/parse-file-mentions-field';

describe('parseFileMentionsField', () => {
  it('decodes a JSON array of paths', () => {
    expect(parseFileMentionsField(JSON.stringify(['a.ts', 'b/c.ts']))).toEqual([
      'a.ts',
      'b/c.ts',
    ]);
  });

  it('drops non-string entries', () => {
    expect(
      parseFileMentionsField(JSON.stringify(['a.ts', 1, null, 'b.ts'])),
    ).toEqual(['a.ts', 'b.ts']);
  });

  it('returns null for an empty array', () => {
    expect(parseFileMentionsField(JSON.stringify([]))).toBeNull();
  });

  it('returns null for null input', () => {
    expect(parseFileMentionsField(null)).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseFileMentionsField('')).toBeNull();
  });

  it('returns null for a non-array JSON value', () => {
    expect(
      parseFileMentionsField(JSON.stringify({ paths: ['a.ts'] })),
    ).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    expect(parseFileMentionsField('{not json')).toBeNull();
  });
});
