import { describe, expect, it } from 'vitest';

import type { CmsFragmentTreeRow } from '../cms-fragment-tree/cms-fragment-tree.types.ts';
import { planCmsFragmentClone } from './cms-fragments.utils.ts';

const buildRow = (
  path: readonly string[],
  overrides: Partial<CmsFragmentTreeRow> = {},
): CmsFragmentTreeRow => {
  const uuid = path[path.length - 1] ?? '';

  return {
    depth: path.length - 1,
    edgeCreatedAt: null,
    isSystem: false,
    name: uuid,
    path,
    position: 0,
    properties: { copy: uuid },
    schemaUuid: `schema-${uuid}`,
    typename: 'Heading',
    uuid,
    ...overrides,
  };
};

const sequentialUuids = (): (() => string) => {
  let next = 0;

  return () => {
    next += 1;

    return `new-${next}`;
  };
};

describe('planCmsFragmentClone', () => {
  describe('when the tree is the root alone', () => {
    it('copies it under the new name, never as a system fragment', () => {
      const plan = planCmsFragmentClone(
        [buildRow(['root'], { isSystem: true })],
        'Root (copy)',
        sequentialUuids(),
      );

      expect(plan).toEqual({
        edges: [],
        fragments: [
          {
            isSystem: false,
            name: 'Root (copy)',
            properties: { copy: 'root' },
            schemaUuid: 'schema-root',
            typename: 'Heading',
            uuid: 'new-1',
          },
        ],
        rootUuid: 'new-1',
      });
    });
  });

  describe('when the tree has descendants', () => {
    it('copies every occurrence with fresh edges in the same order, whatever the row order', () => {
      const plan = planCmsFragmentClone(
        [
          buildRow(['root', 'a', 'leaf'], { position: 0 }),
          buildRow(['root', 'b'], { position: 1 }),
          buildRow(['root'], {}),
          buildRow(['root', 'a'], { isSystem: true, position: 0 }),
        ],
        'Copy',
        sequentialUuids(),
      );

      expect(plan?.rootUuid).toBe('new-1');
      expect(plan?.fragments.map((fragment) => fragment.name)).toEqual([
        'Copy',
        'b',
        'a',
        'leaf',
      ]);
      expect(plan?.fragments[2]?.isSystem).toBe(true);
      expect(plan?.edges).toEqual([
        { childUuid: 'new-2', parentUuid: 'new-1', sortOrder: 1 },
        { childUuid: 'new-3', parentUuid: 'new-1', sortOrder: 0 },
        { childUuid: 'new-4', parentUuid: 'new-3', sortOrder: 0 },
      ]);
    });

    it('copies a fragment shared by two parents once per occurrence, so the copy is a tree', () => {
      const plan = planCmsFragmentClone(
        [
          buildRow(['root']),
          buildRow(['root', 'a']),
          buildRow(['root', 'b']),
          buildRow(['root', 'a', 'shared']),
          buildRow(['root', 'b', 'shared']),
        ],
        'Copy',
        sequentialUuids(),
      );
      const sharedCopies = plan?.fragments.filter((fragment) => {
        return fragment.name === 'shared';
      });

      expect(sharedCopies).toHaveLength(2);
      expect(new Set(plan?.edges.map((edge) => edge.childUuid)).size).toBe(4);
    });
  });

  describe('when there is no root row', () => {
    it('returns null', () => {
      expect(planCmsFragmentClone([], 'Copy', sequentialUuids())).toBeNull();
      expect(
        planCmsFragmentClone(
          [buildRow(['root', 'orphan'])],
          'Copy',
          sequentialUuids(),
        ),
      ).toBeNull();
    });
  });
});
