import { describe, expect, test } from 'vitest';
import { readSearchParam } from '../search-param';

describe('readSearchParam', () => {
  test('reads the canonical `search` param', () => {
    expect(readSearchParam(new URLSearchParams('search=widgets'))).toBe(
      'widgets',
    );
  });

  test('falls back to the legacy `q` param', () => {
    expect(readSearchParam(new URLSearchParams('q=legacy'))).toBe('legacy');
  });

  test('prefers `search` over the legacy `q`', () => {
    expect(readSearchParam(new URLSearchParams('search=new&q=old'))).toBe(
      'new',
    );
  });

  test('trims surrounding whitespace', () => {
    expect(
      readSearchParam(new URLSearchParams('search=%20%20spaced%20%20')),
    ).toBe('spaced');
  });

  test('returns an empty string when neither param is present', () => {
    expect(readSearchParam(new URLSearchParams())).toBe('');
  });

  test('returns an empty string for a whitespace-only query', () => {
    expect(readSearchParam(new URLSearchParams('search=%20%20'))).toBe('');
  });
});
