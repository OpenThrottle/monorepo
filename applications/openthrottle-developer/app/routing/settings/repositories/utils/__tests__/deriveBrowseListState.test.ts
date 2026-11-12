import { describe, expect, test } from 'vitest';

import { deriveBrowseListState } from '../deriveBrowseListState';

describe('deriveBrowseListState', () => {
  test('reports loading while a browse is pending, even with an error', () => {
    expect(
      deriveBrowseListState({
        browseError: 'nope',
        entryCount: 2,
        isBrowsing: true,
      }),
    ).toBe('loading');
  });

  test('reports the error over an empty listing', () => {
    expect(
      deriveBrowseListState({
        browseError: 'nope',
        entryCount: 0,
        isBrowsing: false,
      }),
    ).toBe('error');
  });

  test('reports empty when there are no entries', () => {
    expect(
      deriveBrowseListState({
        browseError: null,
        entryCount: 0,
        isBrowsing: false,
      }),
    ).toBe('empty');
  });

  test('reports entries otherwise', () => {
    expect(
      deriveBrowseListState({
        browseError: null,
        entryCount: 3,
        isBrowsing: false,
      }),
    ).toBe('entries');
  });
});
