import type { CmsFragment } from '../types/cms-fragment';

/**
 * @description A small page tree: a grid holding a heading, a logic branch and an unknown block.
 * Specs only — not exported from the package.
 */
export const MOCK_FRAGMENTS: readonly CmsFragment[] = [
  {
    children: [
      {
        children: [],
        properties: { copy: 'Hello world', heading: 'h1' },
        typename: 'Heading',
        uuid: 'heading-1',
      },
      {
        children: [
          {
            children: [],
            properties: { copy: 'Variant B', heading: 'h3' },
            typename: 'Heading',
            uuid: 'heading-2',
          },
        ],
        properties: { param: 'variant', value: 'b' },
        typename: 'LogicParams',
        uuid: 'logic-1',
      },
      {
        children: [],
        properties: {},
        typename: 'NotARealBlock',
        uuid: 'unknown-1',
      },
    ],
    properties: { className: 'grid-cols-2' },
    typename: 'LayoutGrid',
    uuid: 'grid-1',
  },
];
