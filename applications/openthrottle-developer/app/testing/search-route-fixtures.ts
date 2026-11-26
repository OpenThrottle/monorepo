import type {
  SearchChunk,
  SearchCodeIndexStatusFragment,
  SearchCodeMatchFragment,
  SearchCodeRepositoryFragment,
} from '~/__generated__/graphql';
import type { SearchIndexCodeData } from '~/routing/search/types/search-index';
import type {
  SearchStatsCorpusView,
  SearchStatsKnowledgeView,
} from '~/routing/search/types/search-stats';

/**
 * @description Stable mock chunk for search route and results table tests; extend or override per case.
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
  readonly scope: 'knowledge';
  readonly stats: SearchStatsCorpusView | SearchStatsKnowledgeView;
  readonly total: number;
}

/**
 * @description Knowledge-results stats for a query whose ranking is `total` plans.
 */
export const createSearchKnowledgeStats = (
  total: number,
): SearchStatsKnowledgeView => {
  return {
    kind: 'knowledge',
    mode: 'hybrid',
    reason: null,
    sourceCounts: {
      __typename: 'SearchSourceCounts',
      documentation: 0,
      plan: total,
      task: 0,
    },
    total,
  };
};

export const searchIndexLoaderFixture: SearchIndexLoaderFixture = {
  expandRankingDetails: false,
  limit: 10,
  page: 1,
  query: 'test',
  results: {
    chunks: [searchChunkFixture],
  },
  scope: 'knowledge',
  stats: createSearchKnowledgeStats(1),
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
  scope: 'knowledge',
  stats: createSearchKnowledgeStats(15),
  total: 15,
};

export const searchIndexLoaderFixtureEmptyQuery: SearchIndexLoaderFixture = {
  expandRankingDetails: false,
  limit: 10,
  page: 1,
  query: '',
  results: { chunks: [] },
  scope: 'knowledge',
  stats: {
    coverage: [
      {
        __typename: 'EmbeddingCoverageObject',
        embedded: 4,
        entity: 'plan',
        total: 5,
      },
    ],
    kind: 'corpus',
  },
  total: 0,
};

/** @description A registered primary checkout with a GitHub remote, for code-scope tests. */
export const searchCodeRepositoryFixture: SearchCodeRepositoryFragment = {
  __typename: 'WorkspaceLocalRepositoryObject',
  displayName: 'monorepo',
  gitDefaultBranch: 'main',
  gitRemoteUrl: 'git@github.com:acme/monorepo.git',
  id: 'repo-1',
  kind: 'primary',
};

/** @description One code match, for code-scope tests. */
export const searchCodeMatchFixture: SearchCodeMatchFragment = {
  __typename: 'CodeSearchMatch',
  content: 'export const settle = () => {};',
  endLine: 12,
  path: 'src/settle.ts',
  score: 0.82,
  startLine: 10,
};

/** @description A ready index with chunks, for code-scope tests. */
export const searchCodeIndexFixture: SearchCodeIndexStatusFragment = {
  __typename: 'CodeIndexStatusObject',
  failedReason: null,
  indexedChunks: 42,
  repositoryId: 'repo-1',
  status: 'ready',
};

/** @description Code-scope loader data with one match against a ready index. */
export const searchCodeLoaderFixture: SearchIndexCodeData = {
  code: {
    available: true,
    canListRepositories: true,
    index: searchCodeIndexFixture,
    matches: [searchCodeMatchFixture],
    repositories: [searchCodeRepositoryFixture],
    repository: searchCodeRepositoryFixture,
  },
  expandRankingDetails: false,
  limit: 10,
  page: 1,
  query: 'settle',
  scope: 'code',
  stats: { index: searchCodeIndexFixture, kind: 'code', total: 1 },
  total: 1,
};
