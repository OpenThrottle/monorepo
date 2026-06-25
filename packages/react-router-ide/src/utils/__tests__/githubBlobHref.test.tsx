import { describe, expect, test } from 'vitest';
import { githubBlobHref } from '../githubBlobHref';

describe('githubBlobHref', () => {
  test('defaults the ref to main', () => {
    expect(githubBlobHref({ path: 'src/a.ts', repo: 'owner/repo' })).toBe(
      'https://github.com/owner/repo/blob/main/src/a.ts',
    );
  });

  test('uses the given sha and line anchor', () => {
    expect(
      githubBlobHref({
        line: 12,
        path: 'src/a.ts',
        repo: 'owner/repo',
        sha: 'abc123',
      }),
    ).toBe('https://github.com/owner/repo/blob/abc123/src/a.ts#L12');
  });

  test('treats an empty sha as the default ref', () => {
    expect(githubBlobHref({ path: 'a.ts', repo: 'o/r', sha: '' })).toBe(
      'https://github.com/o/r/blob/main/a.ts',
    );
  });

  test('URL-encodes spaces and `#` in segments while preserving separators', () => {
    expect(
      githubBlobHref({ line: 9, path: 'my dir/a#b.ts', repo: 'owner/repo' }),
    ).toBe('https://github.com/owner/repo/blob/main/my%20dir/a%23b.ts#L9');
  });
});
