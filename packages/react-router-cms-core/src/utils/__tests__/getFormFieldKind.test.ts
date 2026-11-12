import { describe, expect, test } from 'vitest';

import type { CmsJsonSchema } from '../../types/cms-json-schema';
import { getFormFieldKind } from '../getFormFieldKind';

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
    widgetClasses: { type: 'string', 'x-cms-widget': 'className' },
    widgetItems: { type: 'array', 'x-cms-widget': 'children' },
    widgetSize: { enum: ['sm'], type: 'string', 'x-cms-widget': 'json' },
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
    ['widgetClasses', 'className'],
    ['widgetItems', 'children'],
    ['widgetSize', 'wysiwyg'],
  ])('maps %s to %s', (key, kind) => {
    expect(getFormFieldKind(key, schema)).toBe(kind);
  });
});
