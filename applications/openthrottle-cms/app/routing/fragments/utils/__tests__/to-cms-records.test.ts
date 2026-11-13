import { describe, expect, it } from 'vitest';

import { MOCK_CONTAINER_EDITOR_RECORDS } from '~/routing/fragments/data/mock.fragment-editor';

import type {
  CmsFragmentObjectInput,
  CmsSchemaObjectInput,
} from '../to-cms-records';
import {
  toCmsChildRecord,
  toCmsFragmentRecord,
  toCmsParsedSchema,
  toCmsPreviewFragments,
} from '../to-cms-records';

const fragment = (
  overrides: Partial<CmsFragmentObjectInput> = {},
): CmsFragmentObjectInput => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    isSystem: false,
    name: 'Hero',
    propertiesJson: '{"title":"Hello"}',
    schemaUuid: 'schema-1',
    typename: 'ContentHero',
    updatedAt: new Date('2026-11-02T00:00:00.000Z'),
    uuid: 'fragment-1',
    ...overrides,
  };
};

const schema = (
  overrides: Partial<CmsSchemaObjectInput> = {},
): CmsSchemaObjectInput => {
  return {
    createdAt: '2026-11-01T00:00:00.000Z',
    jsonSchemaJson: `{"properties":{"title":{"type":"string"}},"type":"object"}`,
    status: 'ACTIVE',
    typename: 'ContentHero',
    updatedAt: '2026-11-01T00:00:00.000Z',
    uuid: 'schema-1',
    version: 'abc',
    ...overrides,
  };
};

describe('toCmsFragmentRecord', () => {
  describe('when propertiesJson is a JSON object', () => {
    it('maps to a snake_case row with parsed properties', () => {
      const result = toCmsFragmentRecord(fragment());

      expect(result).toEqual({
        ok: true,
        value: {
          created_at: '2026-11-01T00:00:00.000Z',
          is_deleted: false,
          is_system: false,
          name: 'Hero',
          properties: { title: 'Hello' },
          schema_uuid: 'schema-1',
          typename: 'ContentHero',
          updated_at: '2026-11-02T00:00:00.000Z',
          uuid: 'fragment-1',
        },
      });
    });
  });

  describe('when propertiesJson is malformed', () => {
    it('fails with invalid-json instead of throwing', () => {
      expect(toCmsFragmentRecord(fragment({ propertiesJson: '{' }))).toEqual({
        ok: false,
        reason: 'invalid-json',
      });
    });
  });

  describe('when propertiesJson is not an object', () => {
    it.each(['[]', '"text"', 'null', '3'])('fails for %s', (json) => {
      expect(toCmsFragmentRecord(fragment({ propertiesJson: json }))).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
    });
  });
});

describe('toCmsParsedSchema', () => {
  describe('when jsonSchemaJson is a JSON schema object', () => {
    it('maps to a parsed schema row', () => {
      const result = toCmsParsedSchema(schema());

      expect(result.ok).toBe(true);
      expect(result.ok && result.value).toMatchObject({
        json_schema: { properties: { title: { type: 'string' } } },
        status: 'ACTIVE',
        typename: 'ContentHero',
        uuid: 'schema-1',
        version: 'abc',
      });
    });
  });

  describe('when status is missing or unknown', () => {
    it.each([null, undefined, 'ARCHIVED'])('reads %s as DRAFT', (status) => {
      const result = toCmsParsedSchema(schema({ status }));

      expect(result.ok && result.value.status).toBe('DRAFT');
    });
  });

  describe('when jsonSchemaJson is malformed', () => {
    it('fails with invalid-json', () => {
      expect(toCmsParsedSchema(schema({ jsonSchemaJson: 'nope' }))).toEqual({
        ok: false,
        reason: 'invalid-json',
      });
    });
  });

  describe('when jsonSchemaJson is not an object', () => {
    it('fails with not-an-object', () => {
      expect(toCmsParsedSchema(schema({ jsonSchemaJson: '[1]' }))).toEqual({
        ok: false,
        reason: 'not-an-object',
      });
    });
  });

  describe('when the object is not shaped like a JSON schema', () => {
    it('fails with not-a-schema', () => {
      const result = toCmsParsedSchema(
        schema({ jsonSchemaJson: '{"properties":[]}' }),
      );

      expect(result).toEqual({ ok: false, reason: 'not-a-schema' });
    });
  });
});

describe('toCmsChildRecord', () => {
  describe('when propertiesJson is malformed', () => {
    it('keeps the child with empty properties', () => {
      expect(toCmsChildRecord(fragment({ propertiesJson: '{' }))).toMatchObject(
        { name: 'Hero', properties: {}, uuid: 'fragment-1' },
      );
    });
  });
});

describe('toCmsPreviewFragments', () => {
  it('roots the tree at the fragment, with its draft and direct children', () => {
    const [root] = toCmsPreviewFragments(MOCK_CONTAINER_EDITOR_RECORDS);

    expect(root).toMatchObject({
      properties: { className: 'grid' },
      typename: 'LayoutGrid',
      uuid: 'grid-1',
    });
    expect(root?.children.map((child) => child.uuid)).toEqual([
      'child-1',
      'child-2',
    ]);
    expect(root?.children[0]?.children).toEqual([]);
  });
});
