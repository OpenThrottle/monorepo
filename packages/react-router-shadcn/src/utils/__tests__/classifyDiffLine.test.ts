import { describe, expect, test } from 'vitest';

import { classifyDiffLine, classifyDiffLines } from '../classifyDiffLine';

describe('classifyDiffLine', () => {
  test('hunk headers are hunk', () => {
    expect(classifyDiffLine('@@ -1 +1 @@', false)).toBe('hunk');
  });

  test('inside a hunk, +/- are add/remove and "\\" is meta', () => {
    expect(classifyDiffLine('+a', true)).toBe('add');
    expect(classifyDiffLine('-a', true)).toBe('remove');
    expect(classifyDiffLine('\\ No newline at end of file', true)).toBe('meta');
    expect(classifyDiffLine(' a', true)).toBe('context');
  });

  test('before a hunk, file headers are meta', () => {
    expect(classifyDiffLine('+++ b/a.ts', false)).toBe('meta');
    expect(classifyDiffLine('--- a/a.ts', false)).toBe('meta');
    expect(classifyDiffLine('rename from x', false)).toBe('meta');
  });
});

describe('classifyDiffLines', () => {
  test('returns nothing for an empty patch', () => {
    expect(classifyDiffLines('')).toEqual([]);
  });

  test('a second file header leaves hunk mode again', () => {
    const kinds = classifyDiffLines(
      ['@@ -1 +1 @@', '+x', 'diff --git a/b b/b', '+++ b/b'].join('\n'),
    ).map((line) => line.kind);

    expect(kinds).toEqual(['hunk', 'add', 'meta', 'meta']);
  });
});
