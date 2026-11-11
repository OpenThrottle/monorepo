import { describe, expect, it } from 'vitest';

import {
  canonicalize,
  CMS_WIDGET_KEYWORD,
  diffSchemaFiles,
  generatePackageSchemas,
  parseDefault,
  schemaVersion,
} from '../generate-cms-schemas.ts';

describe('parseDefault', () => {
  it('parses JSON literals', () => {
    expect(parseDefault('"md"')).toBe('md');
    expect(parseDefault('[]')).toEqual([]);
    expect(parseDefault('{}')).toEqual({});
    expect(parseDefault(' 3 ')).toBe(3);
  });

  it('keeps non-JSON text as a trimmed string', () => {
    expect(parseDefault('  <div>hi</div>\n')).toBe('<div>hi</div>');
  });
});

describe('schemaVersion', () => {
  it('ignores key order', () => {
    const reversed = Object.fromEntries([
      [
        'b',
        Object.fromEntries([
          ['d', 3],
          ['c', 2],
        ]),
      ],
      ['a', 1],
    ]);

    expect(schemaVersion({ a: 1, b: { c: 2, d: 3 } })).toBe(
      schemaVersion(reversed),
    );
  });

  it('ignores the $comment banner', () => {
    expect(schemaVersion({ $comment: 'one', type: 'object' })).toBe(
      schemaVersion({ $comment: 'two', type: 'object' }),
    );
  });

  it('changes when the schema changes', () => {
    expect(schemaVersion({ type: 'object' })).not.toBe(
      schemaVersion({ type: 'string' }),
    );
  });
});

describe('canonicalize', () => {
  it('sorts keys recursively and keeps array order', () => {
    const unsorted = Object.fromEntries([
      [
        'b',
        [
          Object.fromEntries([
            ['z', 1],
            ['y', 2],
          ]),
        ],
      ],
      ['a', 1],
    ]);
    const canonical = canonicalize(unsorted);

    expect(JSON.stringify(canonical)).toBe('{"a":1,"b":[{"y":2,"z":1}]}');
  });
});

describe('diffSchemaFiles', () => {
  it('reports changed, missing and orphan files', () => {
    const actual = new Map([
      ['A.schema.json', 'same'],
      ['B.schema.json', 'old'],
      ['Orphan.schema.json', 'x'],
    ]);
    const expected = new Map([
      ['A.schema.json', 'same'],
      ['B.schema.json', 'new'],
      ['C.schema.json', 'y'],
    ]);

    expect(diffSchemaFiles(actual, expected)).toEqual([
      'B.schema.json',
      'C.schema.json',
      'Orphan.schema.json',
    ]);
  });
});

describe('generatePackageSchemas', () => {
  const blocks = generatePackageSchemas('packages/react-router-cms-ui');
  const button = blocks.find((block) => block.typename === 'Button');
  const layout = blocks.find((block) => block.typename === 'Layout');

  it('discovers every block that carries a debug static', () => {
    expect(blocks.map((block) => block.typename)).toEqual([
      'Button',
      'Card',
      'Carousel',
      'Heading',
      'Hero',
      'Image',
      'Layout',
      'Link',
      'Tweet',
      'Wysiwyg',
    ]);
  });

  it('emits own members only, never inherited DOM attributes', () => {
    expect(Object.keys(button?.schema['properties'] ?? {})).toEqual([
      'className',
      'cta',
      'size',
      'variant',
    ]);
  });

  it('emits a widget as x-cms-widget next to a standard type', () => {
    expect(button?.schema['properties']).toMatchObject({
      className: { [CMS_WIDGET_KEYWORD]: 'className', type: 'string' },
    });
  });

  it('never requires a children widget', () => {
    expect(layout?.schema['required']).toEqual([]);
    expect(layout?.schema['properties']).toMatchObject({
      children: { [CMS_WIDGET_KEYWORD]: 'children', type: 'array' },
    });
  });
});
