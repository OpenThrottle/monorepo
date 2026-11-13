import { describe, expect, it } from 'vitest';

import {
  getLayoutFragmentRowHref,
  getLayoutFragmentRowId,
  getLayoutRowHref,
} from '../layout-rows';

const NODE = {
  depth: 1,
  key: 'node-key-1',
  name: 'Hero',
  typename: 'Hero',
  uuid: 'fragment-1',
};

describe('getLayoutRowHref', () => {
  it('links a row to its layout detail route', () => {
    expect(
      getLayoutRowHref({
        createdAt: '2026-11-01T00:00:00.000Z',
        name: 'Welcome',
        slug: 'welcome',
        status: 'ACTIVE',
        tags: [],
        updatedAt: '2026-11-02T00:00:00.000Z',
        uuid: 'layout-1',
      }),
    ).toBe('/layouts/layout-1');
  });
});

describe('getLayoutFragmentRowHref', () => {
  it('links a tree node to its fragment detail route', () => {
    expect(getLayoutFragmentRowHref(NODE)).toBe('/fragments/fragment-1');
  });
});

describe('getLayoutFragmentRowId', () => {
  it('keys a tree node by its tree key, not its uuid', () => {
    expect(getLayoutFragmentRowId(NODE)).toBe('node-key-1');
  });
});
