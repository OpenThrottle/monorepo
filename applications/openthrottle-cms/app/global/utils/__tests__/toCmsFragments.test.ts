import { describe, expect, it } from 'vitest';

import type { CmsFragmentNodeInput } from '../toCmsFragments';
import { toCmsFragments } from '../toCmsFragments';

const node = (
  key: string,
  overrides: Partial<CmsFragmentNodeInput> = {},
): CmsFragmentNodeInput => {
  return {
    childKeys: [],
    key,
    parentKey: null,
    propertiesJson: '{}',
    typename: `Type-${key}`,
    uuid: key.split('/').at(-1) ?? key,
    ...overrides,
  };
};

describe('toCmsFragments', () => {
  describe('when nodes form a nested tree', () => {
    it('nests children in childKeys order and parses properties', () => {
      const fragments = toCmsFragments([
        node('r', { childKeys: ['r/b', 'r/a'] }),
        node('r/a', { parentKey: 'r', propertiesJson: '{"copy":"x"}' }),
        node('r/b', { childKeys: ['r/b/c'], parentKey: 'r' }),
        node('r/b/c', { parentKey: 'r/b' }),
      ]);

      expect(fragments).toHaveLength(1);
      expect(fragments[0]?.children.map((child) => child.uuid)).toEqual([
        'b',
        'a',
      ]);
      expect(fragments[0]?.children[1]?.properties).toEqual({ copy: 'x' });
      expect(fragments[0]?.children[0]?.children[0]?.children).toEqual([]);
    });
  });

  describe('when a child key has no node', () => {
    it('skips it', () => {
      const fragments = toCmsFragments([node('r', { childKeys: ['r/gone'] })]);

      expect(fragments[0]?.children).toEqual([]);
    });
  });

  describe('when propertiesJson is not an object', () => {
    it.each(['not json', '[1]', '"text"', 'null'])(
      'reads %s as empty properties',
      (propertiesJson) => {
        expect(
          toCmsFragments([node('r', { propertiesJson })])[0]?.properties,
        ).toEqual({});
      },
    );
  });

  describe('when there are no nodes', () => {
    it('returns no roots', () => {
      expect(toCmsFragments([])).toEqual([]);
    });
  });
});
