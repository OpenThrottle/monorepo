import { describe, expect, it } from 'vitest';

import { getComponentRowHref } from '../getComponentRowHref';

describe('getComponentRowHref', () => {
  it('links a row to its component detail route', () => {
    expect(
      getComponentRowHref({
        libraryUuid: 'library-1',
        name: 'Heading',
        status: 'ACTIVE',
        typename: 'Heading',
        uuid: 'component-1',
      }),
    ).toBe('/components/component-1');
  });
});
