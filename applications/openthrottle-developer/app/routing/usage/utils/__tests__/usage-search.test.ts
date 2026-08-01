import { describe, expect, test } from 'vitest';
import { buildUsageSearch } from '../usage-search';

describe('buildUsageSearch', () => {
  test('returns bare ? when no filters are set', () => {
    expect(buildUsageSearch({})).toBe('?');
    expect(
      buildUsageSearch({
        cwd: null,
        gitBranch: null,
        provider: null,
        scope: null,
      }),
    ).toBe('?');
  });

  test('includes only non-empty filter values', () => {
    expect(
      buildUsageSearch({
        cwd: '/tmp/proj',
        gitBranch: 'main',
        provider: 'claude',
        scope: 'ours',
      }),
    ).toBe(
      '?provider=claude&skillScope=ours&skillBranch=main&skillCwd=%2Ftmp%2Fproj',
    );
  });

  test('omits empty strings', () => {
    expect(
      buildUsageSearch({
        cwd: '',
        gitBranch: '',
        provider: 'openai',
        scope: '',
      }),
    ).toBe('?provider=openai');
  });
});
