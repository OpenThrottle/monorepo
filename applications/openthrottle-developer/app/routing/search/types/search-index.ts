import type {
  SearchChunk,
  SearchCodeIndexStatusFragment,
  SearchCodeMatchFragment,
  SearchCodeRepositoryFragment,
} from '~/__generated__/graphql';
import type {
  SearchStatsCodeView,
  SearchStatsCorpusView,
  SearchStatsKnowledgeView,
} from '~/routing/search/types/search-stats';

/** @description Loader fields both scopes share. */
interface SearchIndexLoaderBase {
  readonly expandRankingDetails: boolean;
  readonly limit: number;
  readonly page: number;
  readonly query: string;
  readonly total: number;
}

/** @description The knowledge scope: plans, tasks and docs. */
export interface SearchIndexKnowledgeData extends SearchIndexLoaderBase {
  readonly results: {
    readonly chunks: readonly SearchChunk[];
    readonly reason: string | null;
  };
  readonly scope: 'knowledge';
  readonly stats: SearchStatsCorpusView | SearchStatsKnowledgeView;
}

/**
 * @description The code scope: one registered repository's indexed code. `repository` is null
 * when none is registered; `available` is false when the embedder cannot index code.
 */
export interface SearchIndexCodeData extends SearchIndexLoaderBase {
  readonly code: {
    readonly available: boolean;
    readonly index: SearchCodeIndexStatusFragment | null;
    readonly matches: readonly SearchCodeMatchFragment[];
    readonly repositories: readonly SearchCodeRepositoryFragment[];
    readonly repository: SearchCodeRepositoryFragment | null;
  };
  readonly scope: 'code';
  readonly stats: SearchStatsCodeView;
}

/** @description What the /search loader returns, by scope. */
export type SearchIndexLoaderData =
  SearchIndexCodeData | SearchIndexKnowledgeData;
