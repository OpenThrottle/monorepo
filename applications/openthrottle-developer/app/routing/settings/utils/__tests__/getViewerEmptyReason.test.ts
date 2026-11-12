import { describe, expect, test } from 'vitest';

import { getViewerEmptyReason } from '../getViewerEmptyReason';

describe('getViewerEmptyReason', () => {
  test('reports an empty buffer before anything else', () => {
    expect(
      getViewerEmptyReason({
        entryCount: 0,
        filteredCount: 0,
        levelsDisabled: true,
      }),
    ).toBe('empty-buffer');
  });

  test('reports levels-none when every level is off', () => {
    expect(
      getViewerEmptyReason({
        entryCount: 3,
        filteredCount: 0,
        levelsDisabled: true,
      }),
    ).toBe('levels-none');
  });

  test('reports no-match when filters exclude every entry', () => {
    expect(
      getViewerEmptyReason({
        entryCount: 3,
        filteredCount: 0,
        levelsDisabled: false,
      }),
    ).toBe('no-match');
  });

  test('reports none when entries are visible', () => {
    expect(
      getViewerEmptyReason({
        entryCount: 3,
        filteredCount: 2,
        levelsDisabled: false,
      }),
    ).toBe('none');
  });
});
