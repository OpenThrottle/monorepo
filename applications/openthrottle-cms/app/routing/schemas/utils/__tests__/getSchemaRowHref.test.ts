import { describe, expect, it } from 'vitest';

import { getSchemaRowHref } from '../getSchemaRowHref';

describe('getSchemaRowHref', () => {
  it('links a row to its schema detail route', () => {
    expect(
      getSchemaRowHref({
        createdAt: '2026-11-01T00:00:00.000Z',
        status: 'ACTIVE',
        typename: 'Heading',
        updatedAt: '2026-11-02T00:00:00.000Z',
        uuid: 'schema-1',
        version: 'abc123',
      }),
    ).toBe('/schemas/schema-1');
  });
});
