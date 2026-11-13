import { describe, expect, it } from 'vitest';

import { getLibraryHref } from '../getLibraryHref';

describe('getLibraryHref', () => {
  it('links a library uuid to its detail route', () => {
    expect(getLibraryHref('library-1')).toBe('/libraries/library-1');
  });
});
