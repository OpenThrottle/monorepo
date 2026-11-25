import type {
  SearchCodeIndexStatusFragment,
  SearchCorpusCoverageFragment,
  SearchSourceCountsFieldsFragment,
} from '~/__generated__/graphql';

/** @description Before a query: embedding coverage per source. */
export interface SearchStatsCorpusView {
  readonly coverage: readonly SearchCorpusCoverageFragment[];
  readonly kind: 'corpus';
}

/** @description After a knowledge query: the ranking's size, mode and source split. */
export interface SearchStatsKnowledgeView {
  readonly kind: 'knowledge';
  readonly mode: string;
  readonly reason: string | null;
  readonly sourceCounts: SearchSourceCountsFieldsFragment;
  readonly total: number;
}

/**
 * @description Code scope: the selected repository's index state, and the ranking's size once
 * there is a query (null before one). `index` is null when no repository is registered.
 */
export interface SearchStatsCodeView {
  readonly index: SearchCodeIndexStatusFragment | null;
  readonly kind: 'code';
  readonly total: number | null;
}

/**
 * @description What the /search stats panel shows: corpus size before a knowledge query,
 * result stats after one, and the code index in code scope.
 */
export type SearchStatsView =
  SearchStatsCodeView | SearchStatsCorpusView | SearchStatsKnowledgeView;
