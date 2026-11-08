import type { CODE_INDEX_STATUS } from './code-search.constants.ts';

export type CodeIndexStatus =
  (typeof CODE_INDEX_STATUS)[keyof typeof CODE_INDEX_STATUS];
