import { describe, expect, test } from 'vitest';

import { CMS_STATUS } from '../../config/cms-status';
import type { CmsSchema } from '../../types/cms-records';
import { isCmsJsonSchema, parseCmsSchema } from '../parseCmsSchema';

const row: CmsSchema = {
  created_at: '2026-01-01T00:00:00.000Z',
  is_deleted: false,
  json_schema: { properties: { title: { type: 'string' } }, type: 'object' },
  status: CMS_STATUS.ACTIVE,
  typename: 'Hero',
  updated_at: '2026-01-01T00:00:00.000Z',
  uuid: 'schema-1',
  version: '1.0.0',
};

describe('utils/isCmsJsonSchema', () => {
  test('accepts an object schema', () => {
    expect(isCmsJsonSchema({ type: 'object' })).toBe(true);
  });

  test('rejects null, arrays and primitives', () => {
    expect(isCmsJsonSchema(null)).toBe(false);
    expect(isCmsJsonSchema([])).toBe(false);
    expect(isCmsJsonSchema('schema')).toBe(false);
  });

  test('rejects non-object properties or definitions', () => {
    expect(isCmsJsonSchema({ properties: 'title' })).toBe(false);
    expect(isCmsJsonSchema({ definitions: [] })).toBe(false);
  });
});

describe('utils/parseCmsSchema', () => {
  test('returns the row with its json_schema narrowed', () => {
    const parsed = parseCmsSchema(row);

    expect(parsed?.json_schema.properties?.title?.type).toBe('string');
    expect(parsed?.typename).toBe('Hero');
  });

  test('returns undefined for an unusable json_schema', () => {
    expect(parseCmsSchema({ ...row, json_schema: 'nope' })).toBeUndefined();
  });
});
