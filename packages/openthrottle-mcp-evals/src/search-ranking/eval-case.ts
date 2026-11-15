/**
 * @description Types for the search-ranking eval suite: a case is a query someone would type into
 * `semantic_search` plus the knowledge-base entities a good answer must surface. See ./README.md for the
 * authoring rules.
 */

/**
 * @description Query families, used to filter a run (`--case identifier`) and to group the report. `identifier`
 * queries are exact strings (short plan ids, file names, env vars, error codes) that embeddings rank poorly;
 * `topic` queries describe the work in prose.
 */
export const SEARCH_CASE_KIND = {
  IDENTIFIER: 'identifier',
  TOPIC: 'topic',
} as const;

export type SearchCaseKind =
  (typeof SEARCH_CASE_KIND)[keyof typeof SEARCH_CASE_KIND];

/**
 * @description One entity a relevant result may point at.
 * - `plan`: the plan itself, or any of its tasks (a task is part of the same unit of work).
 * - `task`: that task only.
 * - `documentation`: the documentation row with this repo-relative `path`.
 */
export type SearchTarget =
  | { readonly kind: 'documentation'; readonly path: string }
  | { readonly kind: 'plan'; readonly planId: string }
  | { readonly kind: 'task'; readonly taskId: string };

/**
 * @description One eval case. `relevant` is the full gold set: recall is measured against all of it, and the
 * reciprocal rank uses the first result that matches any of it.
 */
export interface SearchRankingCase {
  readonly id: string;
  readonly kind: SearchCaseKind;
  readonly query: string;
  readonly relevant: readonly SearchTarget[];
  readonly split: 'dev' | 'test';
}

/**
 * @description The fields of a `semantic_search` result chunk the graders read — the GraphQL `SearchChunk`
 * subset that identifies its entity.
 */
export interface RankedChunk {
  readonly planId: string | null;
  readonly source: string;
  readonly sourcePath: string | null;
  readonly taskId: string | null;
}

/**
 * @description How one case scored against one ranked list.
 */
export interface CaseScore {
  readonly caseId: string;
  /** @description 1-based rank of the first relevant chunk, or null when none is in the list. */
  readonly firstRelevantRank: number | null;
  readonly hitAt10: boolean;
  readonly kind: SearchCaseKind;
  readonly recallAt10: number;
  readonly reciprocalRank: number;
}
