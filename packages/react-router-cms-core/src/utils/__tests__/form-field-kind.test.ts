import { describe, expect, test } from 'vitest';

import type { CmsJsonSchema } from '../../types/cms-json-schema';
import { getFormFieldKind } from '../form-field-kind';

const schema: CmsJsonSchema = {
  definitions: { Flag: { type: 'boolean' } },
  properties: {
    choice: { anyOf: [{ type: 'string' }, { type: 'number' }] },
    classes: { type: 'className' },
    color: { type: 'color' },
    flag: { $ref: '#/definitions/Flag' },
    items: { type: 'children' },
    json: { type: 'json' },
    nothing: { type: 'null' },
    size: { enum: ['sm', 'lg'], type: 'string' },
    total: { type: 'integer' },
    untyped: {},
  },
  type: 'object',
};

describe('utils/getFormFieldKind', () => {
  test.each([
    ['choice', 'anyOf'],
    ['classes', 'className'],
    ['color', 'string'],
    ['flag', 'boolean'],
    ['items', 'children'],
    ['json', 'wysiwyg'],
    ['nothing', 'none'],
    ['size', 'select'],
    ['total', 'number'],
    ['untyped', 'none'],
    ['missing', 'none'],
  ])('maps %s to %s', (key, kind) => {
    expect(getFormFieldKind(key, schema)).toBe(kind);
  });
});
