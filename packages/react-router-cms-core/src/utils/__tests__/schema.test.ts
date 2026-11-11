import { describe, expect, test } from 'vitest';

import { MOCK_SCHEMAS } from '../../data/mock.schemas';
import type { CmsJsonSchema } from '../../types/cms-json-schema';
import { getSchemaDefaults } from '../schema-defaults';
import { getSchemaProperty, getSchemaRef } from '../schema-property';
import {
  schemaFindRefs,
  schemaFindRefsRecursive,
  shrinkSchema,
} from '../schema-refs';

const withRefs: CmsJsonSchema = {
  definitions: {
    ButtonProps: { properties: { icon: { $ref: '#/definitions/IconProps' } } },
    IconProps: { properties: { self: { $ref: '#/definitions/IconProps' } } },
    UnusedProps: { type: 'object' },
  },
  properties: {
    cta: { anyOf: [{ $ref: '#/definitions/ButtonProps' }, { type: 'string' }] },
    external: { $ref: 'https://example.com/schema.json' },
  },
  type: 'object',
};

describe('utils/getSchemaProperty', () => {
  test('finds a custom-typed property', () => {
    const result = getSchemaProperty('className', MOCK_SCHEMAS.HeadingProps);

    expect(result).toStrictEqual({
      key: 'className',
      kind: 'found',
      property: {
        default: 'text-3xl text-highlight',
        description: 'Classes to be applied on the component.',
        type: 'className',
      },
    });
  });

  test('reports a missing property instead of throwing', () => {
    expect(getSchemaProperty('nope', MOCK_SCHEMAS.HeadingProps)).toStrictEqual({
      key: 'nope',
      kind: 'missing',
    });
  });
});

describe('utils/getSchemaRef', () => {
  test('resolves a local definition', () => {
    expect(getSchemaRef('#/definitions/UnusedProps', withRefs)).toStrictEqual({
      type: 'object',
    });
  });

  test('returns undefined for an unknown or non-local ref', () => {
    expect(getSchemaRef('#/definitions/Missing', withRefs)).toBeUndefined();
    expect(getSchemaRef('https://example.com/x', withRefs)).toBeUndefined();
  });
});

describe('utils/getSchemaDefaults', () => {
  test('collects every declared default, falsy ones included', () => {
    expect(getSchemaDefaults(MOCK_SCHEMAS.ButtonProps)).toStrictEqual({
      className: 'uppercase',
      cta: 'Call to action',
      secondary: false,
      size: "'md'",
    });
  });

  test('is empty for a schema without properties', () => {
    expect(getSchemaDefaults({ type: 'object' })).toStrictEqual({});
  });
});

describe('utils/schemaFindRefs', () => {
  test('finds direct local refs only', () => {
    expect([...schemaFindRefs(withRefs)]).toStrictEqual(['ButtonProps']);
  });
});

describe('utils/schemaFindRefsRecursive', () => {
  test('follows refs through definitions and survives a cycle', () => {
    expect([...schemaFindRefsRecursive(withRefs)].sort()).toStrictEqual([
      'ButtonProps',
      'IconProps',
    ]);
  });
});

describe('utils/shrinkSchema', () => {
  test('drops unused definitions', () => {
    const shrunk = shrinkSchema(withRefs);

    expect(Object.keys(shrunk.definitions ?? {}).sort()).toStrictEqual([
      'ButtonProps',
      'IconProps',
    ]);
    expect(withRefs.definitions?.UnusedProps).toBeDefined();
  });

  test('removes the definitions key when none are used', () => {
    expect(shrinkSchema(MOCK_SCHEMAS.HeadingProps)).not.toHaveProperty(
      'definitions',
    );
  });
});
