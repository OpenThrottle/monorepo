/**
 * @description Deterministic graders for the code-search suite: does a ranked list of code matches
 * surface a case's gold files, and how high.
 */

import { CODE_SEARCH_K } from './data/dataset.ts';
import type {
  CodeCaseScore,
  CodeRankedMatch,
  CodeSearchCase,
} from './eval-case.ts';

/** @description Mean scores over a group of cases. */
export interface CodeScoreSummary {
  readonly cases: number;
  readonly hitAtK: number;
  readonly meanPrecisionAtK: number;
  readonly mrr: number;
}

/**
 * @description Scores one ranked list: reciprocal rank of the first relevant match (0 when none),
 * whether one is in the top {@link CODE_SEARCH_K}, and the share of those K that are relevant. A
 * file matched by several chunks counts each time, as a reviewer reads each one.
 */
export function scoreCodeCase(
  evalCase: CodeSearchCase,
  ranked: readonly CodeRankedMatch[],
): CodeCaseScore {
  const relevant = new Set(evalCase.relevantPaths);
  const top = ranked.slice(0, CODE_SEARCH_K);
  const firstIndex = ranked.findIndex((match) => relevant.has(match.path));
  const firstRelevantRank = firstIndex === -1 ? null : firstIndex + 1;
  const relevantInTop = top.filter((match) => relevant.has(match.path));
  const isRankedInTop =
    firstRelevantRank !== null && firstRelevantRank <= CODE_SEARCH_K;

  return {
    caseId: evalCase.id,
    firstRelevantRank,
    hitAtK: isRankedInTop,
    kind: evalCase.kind,
    precisionAtK: relevantInTop.length / CODE_SEARCH_K,
    reciprocalRank: firstRelevantRank === null ? 0 : 1 / firstRelevantRank,
  };
}

/** @description Means over `scores`; an empty group summarizes to zeros with `cases: 0`. */
export function summarizeCodeScores(
  scores: readonly CodeCaseScore[],
): CodeScoreSummary {
  if (scores.length === 0) {
    return { cases: 0, hitAtK: 0, meanPrecisionAtK: 0, mrr: 0 };
  }

  const mean = (pick: (score: CodeCaseScore) => number): number => {
    return scores.reduce((sum, score) => sum + pick(score), 0) / scores.length;
  };

  return {
    cases: scores.length,
    hitAtK: mean((score) => (score.hitAtK ? 1 : 0)),
    meanPrecisionAtK: mean((score) => score.precisionAtK),
    mrr: mean((score) => score.reciprocalRank),
  };
}
