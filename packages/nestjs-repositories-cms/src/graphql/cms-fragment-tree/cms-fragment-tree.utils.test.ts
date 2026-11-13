import { describe, expect, it } from 'vitest';

import type { CmsFragmentTreeRow } from './cms-fragment-tree.types.ts';
import {
  buildCmsFragmentTreeNodes,
  parseCmsFragmentTreeRow,
} from './cms-fragment-tree.utils.ts';

const row = (
  path: readonly string[],
  overrides: Partial<CmsFragmentTreeRow> = {},
): CmsFragmentTreeRow => {
  const uuid = path[path.length - 1] ?? '';

  return {
    depth: path.length - 1,
    edgeCreatedAt: path.length > 1 ? new Date('2026-01-01T00:00:00Z') : null,
    isSystem: path.length === 1,
    name: `name-${uuid}`,
    path,
    position: 0,
    properties: {},
    schemaUuid: `schema-${uuid}`,
    typename: `Type${uuid}`,
    uuid,
    ...overrides,
  };
};

describe('buildCmsFragmentTreeNodes', () => {
  describe('when given a nested tree', () => {
    it('returns pre-order nodes with ordered childKeys, children always a list', () => {
      const nodes = buildCmsFragmentTreeNodes([
        row(['r', 'b'], { position: 2 }),
        row(['r']),
        row(['r', 'a'], { position: 1 }),
        row(['r', 'a', 'c']),
      ]);

      expect(nodes.map((node) => node.key)).toEqual([
        'r',
        'r/a',
        'r/a/c',
        'r/b',
      ]);
      expect(nodes[0]).toMatchObject({
        childKeys: ['r/a', 'r/b'],
        parentKey: null,
        schemaUuid: 'schema-r',
        typename: 'Typer',
      });
      expect(nodes[2]).toMatchObject({ childKeys: [], parentKey: 'r/a' });
    });
  });

  describe('when siblings share a sort_order', () => {
    it('breaks ties by edge creation time, then uuid', () => {
      const nodes = buildCmsFragmentTreeNodes([
        row(['r']),
        row(['r', 'z'], { edgeCreatedAt: new Date('2026-01-01T00:00:00Z') }),
        row(['r', 'y'], { edgeCreatedAt: new Date('2026-01-02T00:00:00Z') }),
        row(['r', 'x'], { edgeCreatedAt: new Date('2026-01-02T00:00:00Z') }),
      ]);

      expect(nodes[0]?.childKeys).toEqual(['r/z', 'r/x', 'r/y']);
    });
  });

  describe('when a fragment is shared by two parents', () => {
    it('emits one node per occurrence with distinct keys', () => {
      const nodes = buildCmsFragmentTreeNodes([
        row(['r']),
        row(['r', 'a'], { position: 0 }),
        row(['r', 'b'], { position: 1 }),
        row(['r', 'a', 's']),
        row(['r', 'b', 's']),
      ]);
      const shared = nodes.filter((node) => node.uuid === 's');

      expect(shared.map((node) => node.key)).toEqual(['r/a/s', 'r/b/s']);
    });
  });

  describe('when a row has no parent row', () => {
    it('drops it rather than attaching it anywhere', () => {
      const nodes = buildCmsFragmentTreeNodes([row(['r']), row(['x', 'y'])]);

      expect(nodes.map((node) => node.key)).toEqual(['r']);
    });
  });

  describe('when there is no root row', () => {
    it('returns an empty list', () => {
      expect(buildCmsFragmentTreeNodes([])).toEqual([]);
    });
  });
});

describe('parseCmsFragmentTreeRow', () => {
  const raw = {
    depth: 1,
    edge_created_at: new Date('2026-01-01T00:00:00Z'),
    is_system: null,
    name: 'Hero',
    path: ['r', 'h'],
    position: 3,
    properties: { title: 'Hi' },
    schema_uuid: 's',
    typename: 'Hero',
    uuid: 'h',
  };

  it('maps a driver row and reads a NULL is_system as false', () => {
    expect(parseCmsFragmentTreeRow(raw)).toEqual({
      depth: 1,
      edgeCreatedAt: raw.edge_created_at,
      isSystem: false,
      name: 'Hero',
      path: ['r', 'h'],
      position: 3,
      properties: { title: 'Hi' },
      schemaUuid: 's',
      typename: 'Hero',
      uuid: 'h',
    });
  });

  it.each([
    ['a non-object', 'nope'],
    ['null', null],
    ['a non-array path', { ...raw, path: 'r/h' }],
    ['array properties', { ...raw, properties: [] }],
    ['a string depth', { ...raw, depth: '1' }],
  ])('returns null for %s', (_name, value) => {
    expect(parseCmsFragmentTreeRow(value)).toBeNull();
  });
});
