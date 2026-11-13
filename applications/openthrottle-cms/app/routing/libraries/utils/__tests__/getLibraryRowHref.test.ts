import { describe, expect, it } from 'vitest';

import { getLibraryRowHref } from '../getLibraryRowHref';

describe('getLibraryRowHref', () => {
  it('links a row to its library detail route', () => {
    expect(
      getLibraryRowHref({
        description: null,
        name: 'Core',
        status: 'ACTIVE',
        updatedAt: '2026-11-02T00:00:00.000Z',
        uuid: 'library-1',
      }),
    ).toBe('/libraries/library-1');
  });
});
