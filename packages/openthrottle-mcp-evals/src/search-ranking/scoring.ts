/**
 * @description Deterministic graders for the search-ranking suite: does a ranked list of `semantic_search`
 * chunks surface a case's gold entities, and how high.
 */

import { SEARCH_RANKING_K } from './data/dataset.ts';
import type {
  CaseScore,
  RankedChunk,
  SearchCaseKindValue,
  SearchRankingCase,
  SearchTarget,
} from './eval-case.ts';

/**
 * @description Mean scores over a group of cases.
 */
export interface ScoreSummary {
  readonly cases: number;
  readonly hitAt10: number;
  readonly meanRecallAt10: number;
  readonly mrr: number;
}

/**
 * @description Whether `chunk` points at `target`. A `plan` target accepts the plan and its tasks.
 */
export function chunkMatchesTarget(
  chunk: RankedChunk,
  target: SearchTarget,
): boolean {
  if (target.kind === 'documentation') {
    return chunk.source === 'documentation' && chunk.sourcePath === target.path;
  }

  if (target.kind === 'task') {
    return chunk.source === 'task' && chunk.taskId === target.taskId;
  }

  return (
    (chunk.source === 'plan' || chunk.source === 'task') &&
    chunk.planId === target.planId
  );
}

/**
 * @description Scores one ranked list against a case: reciprocal rank of the first relevant chunk (0 when
 * none), whether one is in the top {@link SEARCH_RANKING_K}, and the share of gold targets found there.
 */
export function scoreCase(
  evalCase: SearchRankingCase,
  ranked: readonly RankedChunk[],
): CaseScore {
  const top = ranked.slice(0, SEARCH_RANKING_K);
  const firstIndex = ranked.findIndex((chunk) => {
    return evalCase.relevant.some((target) => {
      return chunkMatchesTarget(chunk, target);
    });
  });
  const found = evalCase.relevant.filter((target) => {
    return top.some((chunk) => {
      return chunkMatchesTarget(chunk, target);
    });
  });
  const firstRelevantRank = firstIndex === -1 ? null : firstIndex + 1;
  const goldSize = evalCase.relevant.length;
  const recallAt10 = goldSize === 0 ? 0 : found.length / goldSize;
  const isRankedInTop =
    firstRelevantRank !== null && firstRelevantRank <= SEARCH_RANKING_K;

  return {
    caseId: evalCase.id,
    firstRelevantRank,
    hitAt10: isRankedInTop,
    kind: evalCase.kind,
    recallAt10,
    reciprocalRank: firstRelevantRank === null ? 0 : 1 / firstRelevantRank,
  };
}

/**
 * @description Means over `scores`, optionally restricted to one query kind. An empty group summarizes to
 * zeros with `cases: 0`.
 */
export function summarizeScores(
  scores: readonly CaseScore[],
  kind: SearchCaseKindValue | undefined,
): ScoreSummary {
  const group = scores.filter((score) => {
    return kind === undefined || score.kind === kind;
  });

  if (group.length === 0) {
    return { cases: 0, hitAt10: 0, meanRecallAt10: 0, mrr: 0 };
  }

  const mean = (pick: (score: CaseScore) => number): number => {
    return group.reduce((sum, score) => sum + pick(score), 0) / group.length;
  };

  return {
    cases: group.length,
    hitAt10: mean((score) => (score.hitAt10 ? 1 : 0)),
    meanRecallAt10: mean((score) => score.recallAt10),
    mrr: mean((score) => score.reciprocalRank),
  };
}
