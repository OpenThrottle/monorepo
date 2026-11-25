/**
 * @description Types for the code-search eval suite: a case is a query a reviewer would send to
 * `code_search` while looking for code that already exists, plus the files a good answer must
 * surface. See ./README.md for the authoring rules.
 */

/**
 * @description Query families. `body` pastes the code a diff adds (what a duplication check has in
 * hand); `intent` describes what the code does in prose.
 */
export const CODE_SEARCH_CASE_KIND = {
  BODY: 'body',
  INTENT: 'intent',
} as const;

export type CodeSearchCaseKindKey = keyof typeof CODE_SEARCH_CASE_KIND;
export type CodeSearchCaseKindValue =
  (typeof CODE_SEARCH_CASE_KIND)[CodeSearchCaseKindKey];

/**
 * @description One eval case. `relevantPaths` are repo-relative POSIX paths: the existing copy or
 * the home a duplicate should have reused. `origin` names where the case came from (a PR, a probe).
 */
export interface CodeSearchCase {
  readonly id: string;
  readonly kind: CodeSearchCaseKindValue;
  readonly origin: string;
  readonly query: string;
  readonly relevantPaths: readonly string[];
}

/** @description The field of a `codeSemanticSearch` match the graders read. */
export interface CodeRankedMatch {
  readonly path: string;
}

/** @description How one case scored against one ranked list. */
export interface CodeCaseScore {
  readonly caseId: string;
  /** @description 1-based rank of the first relevant match, or null when none is in the list. */
  readonly firstRelevantRank: number | null;
  readonly hitAtK: boolean;
  readonly kind: CodeSearchCaseKindValue;
  /** @description Share of the top K matches that are relevant files. */
  readonly precisionAtK: number;
  readonly reciprocalRank: number;
}
