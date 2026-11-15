/**
 * @description The search-ranking suite's identity on the eval core. Bump the dataset version whenever a case's
 * gold set changes, and the grader version whenever `scoreCase` changes meaning, so stored numbers never mix two
 * definitions.
 */
export const SEARCH_RANKING_TARGET = 'mcp_semantic_search_ranking';

export const SEARCH_RANKING_DATASET_ID = 'mcp-search-ranking';

export const SEARCH_RANKING_DATASET_VERSION = 1;

export const SEARCH_RANKING_GRADER_ID = 'search-ranking';

export const SEARCH_RANKING_GRADER_VERSION = '1';

/** @description Depth the graders read: recall and hit are measured in the top `SEARCH_RANKING_K` chunks. */
export const SEARCH_RANKING_K = 10;
