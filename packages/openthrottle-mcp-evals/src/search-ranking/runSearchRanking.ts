/**
 * @description Runs the search-ranking cases against a live openthrottle-server: every case through the
 * GraphQL `search` query once per requested mode, scored by {@link scoreCase}, then compared by
 * {@link compareSearchModes}.
 */

import { SEARCH_RANKING_K } from './data/data.dataset.ts';
import type { CaseScore, RankedChunk, SearchRankingCase } from './eval-case.ts';
import { scoreCase } from './scoring.ts';

/** @description The modes a run compares: `semantic` is the vector-only baseline. */
export type SearchRankingMode = 'hybrid' | 'semantic';

/** @description What the server answered for one case in one mode. */
export interface SearchAnswer {
  readonly chunks: readonly RankedChunk[];
  /** The mode the server reports it ranked with; differs from the request on a lexical fallback. */
  readonly mode: string;
}

/** @description Issues one search; the CLI's implementation calls GraphQL. */
export type SearchFn = (
  query: string,
  mode: SearchRankingMode,
  limit: number,
) => Promise<SearchAnswer>;

/** @description One mode's scores, plus any case the server answered in a different mode. */
export interface ModeRun {
  /** Case ids the server did not rank in `mode` (e.g. a lexical fallback), which taint the comparison. */
  readonly mismatchedModeCaseIds: readonly string[];
  readonly mode: SearchRankingMode;
  readonly scores: readonly CaseScore[];
}

/**
 * @description Scores every case in `mode`. Searches run one at a time, on purpose: the embedder is a
 * single in-process model, and concurrent calls would only queue behind each other.
 */
export async function runSearchMode(
  cases: readonly SearchRankingCase[],
  mode: SearchRankingMode,
  search: SearchFn,
): Promise<ModeRun> {
  const scores: CaseScore[] = [];
  const mismatchedModeCaseIds: string[] = [];

  for (const evalCase of cases) {
    // eslint-disable-next-line no-await-in-loop -- deliberate sequencing, see the JSDoc
    const answer = await search(evalCase.query, mode, SEARCH_RANKING_K * 2);

    if (answer.mode !== mode) {
      mismatchedModeCaseIds.push(evalCase.id);
    }

    scores.push(scoreCase(evalCase, answer.chunks));
  }

  return { mismatchedModeCaseIds, mode, scores };
}
