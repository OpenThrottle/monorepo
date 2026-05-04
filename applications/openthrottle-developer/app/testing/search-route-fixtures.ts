import type { SearchChunk } from '~/__generated__/graphql';

/**
 * @description Stable mock chunk for search route and SearchCard tests; extend or override per case.
 */
export const searchChunkFixture: SearchChunk = {
  __typename: 'SearchChunk',
  content: 'A plan or task snippet',
  id: 'chunk-1',
  planId: 'plan-1',
  planTitle: 'Test Plan',
  similarity: 0.95,
  source: 'plan',
  sourcePath: null,
  sourceRepo: null,
  sourceSha: null,
  taskId: null,
  taskTitle: null,
};

/**
 * @description Mirrors the `search._index` route loader return shape for stubbed route tests.
 */
export interface SearchIndexLoaderFixture {
  readonly expandRankingDetails: boolean;
  readonly limit: number;
  readonly page: number;
  readonly query: string;
  readonly results: { readonly chunks: readonly SearchChunk[] };
  readonly total: number;
}

export const searchIndexLoaderFixture: SearchIndexLoaderFixture = {
  expandRankingDetails: false,
  limit: 10,
  page: 1,
  query: 'test',
  results: {
    chunks: [searchChunkFixture],
  },
  total: 1,
};

/**
 * @description Builds N distinct chunk ids for pagination / list coverage without inline duplication.
 */
export const createSearchTestChunks = (
  count: number,
  base: SearchChunk = searchChunkFixture,
): SearchChunk[] => {
  return Array.from({ length: count }, (_, i) => ({
    ...base,
    id: `chunk-${i + 1}`,
  }));
};

export const searchIndexLoaderFixturePaginated: SearchIndexLoaderFixture = {
  expandRankingDetails: false,
  limit: 10,
  page: 1,
  query: 'test',
  results: {
    chunks: createSearchTestChunks(15),
  },
  total: 15,
};

export const searchIndexLoaderFixtureEmptyQuery: SearchIndexLoaderFixture = {
  expandRankingDetails: false,
  limit: 10,
  page: 1,
  query: '',
  results: { chunks: [] },
  total: 0,
};
