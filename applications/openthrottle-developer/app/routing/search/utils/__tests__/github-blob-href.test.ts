import { describe, expect, test } from 'vitest';
import { githubBlobHref } from '../github-blob-href';

describe('githubBlobHref', () => {
  test('should use sha when non-empty', () => {
    expect(githubBlobHref('o/r', 'docs/a.md', 'deadbeef')).toBe(
      'https://github.com/o/r/blob/deadbeef/docs/a.md',
    );
  });

  test('should use main when sha is null, undefined, or empty', () => {
    expect(githubBlobHref('o/r', 'docs/a.md', null)).toBe(
      'https://github.com/o/r/blob/main/docs/a.md',
    );
    expect(githubBlobHref('o/r', 'docs/a.md', undefined)).toBe(
      'https://github.com/o/r/blob/main/docs/a.md',
    );
    expect(githubBlobHref('o/r', 'docs/a.md', '')).toBe(
      'https://github.com/o/r/blob/main/docs/a.md',
    );
  });
});
