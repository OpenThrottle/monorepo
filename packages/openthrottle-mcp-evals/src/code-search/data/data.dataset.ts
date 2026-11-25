/**
 * @description The code-search suite's identity. Bump the dataset version whenever a case's gold set
 * changes, and the grader version whenever `scoreCodeCase` changes meaning, so stored numbers never
 * mix two definitions.
 */
export const CODE_SEARCH_DATASET_ID = 'mcp-code-search';

export const CODE_SEARCH_DATASET_VERSION = 1;

export const CODE_SEARCH_GRADER_VERSION = '1';

/** @description Depth the graders read: `code_search` returns 8 by default, a reviewer reads ~5. */
export const CODE_SEARCH_K = 5;

/** @description The case that gates the suite: it must hit in the top {@link CODE_SEARCH_K}. */
export const CODE_SEARCH_GATE_CASE_ID = 'body-parse-date';
