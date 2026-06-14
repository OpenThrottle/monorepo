import type { Location, MetaArgs, MetaDescriptor } from 'react-router';
import { describe, expect, test } from 'vitest';
import { mergeMeta, mergeRouteModuleMeta } from '../metadata';

const location: Location = {
  hash: '',
  key: 'default',
  pathname: '/',
  search: '',
  state: null,
};

const buildMatch = (meta: MetaDescriptor[]): MetaArgs['matches'][number] => ({
  data: undefined,
  id: 'root',
  loaderData: undefined,
  meta,
  params: {},
  pathname: '/',
});

const buildArgs = (matches: MetaArgs['matches']): MetaArgs => ({
  data: undefined,
  loaderData: undefined,
  location,
  matches,
  params: {},
});

describe('mergeMeta', () => {
  test('keeps leaf meta and appends a unique parent meta', () => {
    const meta = mergeMeta(() => [{ title: 'Leaf' }]);

    const result = meta(
      buildArgs([
        buildMatch([
          { title: 'Parent' },
          { content: 'parent', name: 'description' },
        ]),
      ]),
    );

    expect(result).toEqual([
      { title: 'Leaf' },
      { content: 'parent', name: 'description' },
    ]);
  });

  test('treats any two titles as duplicates so the leaf title wins', () => {
    const meta = mergeMeta(() => [{ title: 'Leaf' }]);

    const result = meta(buildArgs([buildMatch([{ title: 'Parent' }])]));

    expect(result).toEqual([{ title: 'Leaf' }]);
  });
});

describe('mergeRouteModuleMeta', () => {
  const run = (
    leaf: MetaDescriptor[],
    parent: MetaDescriptor[],
  ): MetaDescriptor[] => {
    const meta = mergeRouteModuleMeta(() => leaf);

    return meta({ matches: [{ meta: parent }] });
  };

  test('appends a unique parent meta and dedupes by name', () => {
    expect(
      run(
        [{ content: 'leaf', name: 'description' }],
        [
          { content: 'parent', name: 'description' },
          { content: 'a, b', name: 'keywords' },
        ],
      ),
    ).toEqual([
      { content: 'leaf', name: 'description' },
      { content: 'a, b', name: 'keywords' },
    ]);
  });

  test('dedupes by property', () => {
    expect(
      run(
        [{ content: 'leaf', property: 'og:title' }],
        [{ content: 'parent', property: 'og:title' }],
      ),
    ).toEqual([{ content: 'leaf', property: 'og:title' }]);
  });

  test('dedupes by title regardless of value', () => {
    expect(run([{ title: 'A' }], [{ title: 'B' }])).toEqual([{ title: 'A' }]);
  });

  test('dedupes identical descriptors via the JSON.stringify fallback', () => {
    const link: MetaDescriptor = {
      href: '/styles.css',
      rel: 'stylesheet',
      tagName: 'link',
    };

    expect(run([link], [{ ...link }])).toEqual([link]);
  });

  test('appends a structurally different descriptor', () => {
    const leafLink: MetaDescriptor = {
      href: '/leaf.css',
      rel: 'stylesheet',
      tagName: 'link',
    };
    const parentLink: MetaDescriptor = {
      href: '/parent.css',
      rel: 'stylesheet',
      tagName: 'link',
    };

    expect(run([leafLink], [parentLink])).toEqual([leafLink, parentLink]);
  });

  test('tolerates matches with missing or undefined meta', () => {
    const meta = mergeRouteModuleMeta(() => [{ title: 'Leaf' }]);

    expect(meta({ matches: [{}, { meta: undefined }] })).toEqual([
      { title: 'Leaf' },
    ]);
  });
});
