import { describe, expect, test } from 'vitest';

import type { CmsFragment } from '../../types/cms-fragment';
import { getLayoutBreadcrumbs } from '../getLayoutBreadcrumbs';

const leaf = (uuid: string, typename: string): CmsFragment => {
  return { children: [], properties: {}, typename, uuid };
};

const layout: CmsFragment = {
  children: [
    {
      children: [leaf('title', 'Heading'), leaf('cta', 'Button')],
      properties: {},
      typename: 'Hero',
      uuid: 'hero',
    },
    leaf('footer', 'Footer'),
  ],
  properties: {},
  typename: 'Layout',
  uuid: 'root',
};

describe('getLayoutBreadcrumbs', () => {
  describe('when the fragment is nested', () => {
    test('returns the path below the root', () => {
      expect(getLayoutBreadcrumbs({ fragmentUuid: 'cta', layout })).toEqual([
        { typename: 'Hero', uuid: 'hero' },
        { typename: 'Button', uuid: 'cta' },
      ]);
    });
  });

  describe('when the fragment is a direct child of the root', () => {
    test('returns a single crumb', () => {
      expect(getLayoutBreadcrumbs({ fragmentUuid: 'footer', layout })).toEqual([
        { typename: 'Footer', uuid: 'footer' },
      ]);
    });
  });

  describe('when the fragment is the root', () => {
    test('returns no crumbs', () => {
      expect(getLayoutBreadcrumbs({ fragmentUuid: 'root', layout })).toEqual(
        [],
      );
    });
  });

  describe('when the fragment is not in the tree', () => {
    test('returns no crumbs', () => {
      expect(getLayoutBreadcrumbs({ fragmentUuid: 'missing', layout })).toEqual(
        [],
      );
    });
  });

  describe('when no fragment is given', () => {
    test('returns no crumbs', () => {
      expect(getLayoutBreadcrumbs({ fragmentUuid: undefined, layout })).toEqual(
        [],
      );
    });
  });
});
