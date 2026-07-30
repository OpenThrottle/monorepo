import { describe, expect, test } from 'vitest';
import { flattenDocsNav, getDocPager } from '../buildDocsNav';
import type { DocsNavGroup, DocsNavItem } from '../buildDocsNav';

const sequence: readonly DocsNavItem[] = [
  { path: '/docs', title: 'Overview' },
  { path: '/docs/getting-started', title: 'Getting Started' },
  { path: '/docs/architecture', title: 'Architecture' },
];

describe('flattenDocsNav', () => {
  test('flattens groups into one ordered sequence', () => {
    const groups: readonly DocsNavGroup[] = [
      { items: [sequence[0], sequence[1]], label: '00. Getting Started' },
      { items: [sequence[2]], label: '01. Concepts' },
    ];

    expect(flattenDocsNav(groups)).toEqual(sequence);
  });
});

describe('getDocPager', () => {
  test('first page has no previous', () => {
    expect(getDocPager(sequence, '/docs')).toEqual({
      next: sequence[1],
      prev: null,
    });
  });

  test('middle page has both neighbors', () => {
    expect(getDocPager(sequence, '/docs/getting-started')).toEqual({
      next: sequence[2],
      prev: sequence[0],
    });
  });

  test('last page has no next', () => {
    expect(getDocPager(sequence, '/docs/architecture')).toEqual({
      next: null,
      prev: sequence[1],
    });
  });

  test('unknown path yields no neighbors', () => {
    expect(getDocPager(sequence, '/docs/missing')).toEqual({
      next: null,
      prev: null,
    });
  });
});
