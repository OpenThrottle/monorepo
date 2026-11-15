/**
 * @description Decides whether a candidate ranking (hybrid) may replace the baseline (vector-only): the
 * ship rule of OT plan e5397271 — no regression overall or on topic queries, and a measurable gain on
 * identifier queries.
 */

import type {
  PairedDifference,
  PairedDifferenceError,
} from '@openthrottle/agentic-evals';
import { pairedDifference } from '@openthrottle/agentic-evals';

import type { CaseScore } from './eval-case.ts';
import type { ModeRun } from './runSearchRanking.ts';
import type { ScoreSummary } from './scoring.ts';
import { summarizeScores } from './scoring.ts';

/** @description Means for one run, overall and per query kind. */
export interface ModeSummary {
  readonly identifier: ScoreSummary;
  readonly overall: ScoreSummary;
  readonly topic: ScoreSummary;
}

/** @description The verdict and the numbers behind it. */
export interface ModeComparison {
  readonly baseline: ModeSummary;
  readonly candidate: ModeSummary;
  /** Paired hit@10 comparison (bootstrap CI + McNemar) over every case. */
  readonly hitAt10Difference: PairedDifference | PairedDifferenceError;
  /** Identifier MRR gain, candidate minus baseline. */
  readonly identifierMrrGain: number;
  /** Cases whose reciprocal rank dropped, worst first. */
  readonly rankDrops: readonly {
    readonly baselineRank: number | null;
    readonly candidateRank: number | null;
    readonly caseId: string;
  }[];
  readonly ship: boolean;
  /** Human-readable reasons the verdict is what it is. */
  readonly why: readonly string[];
}

/** @description Thresholds for {@link compareSearchModes}. */
export interface CompareOptions {
  /** Smallest identifier MRR gain that counts as measurable. */
  readonly minIdentifierMrrGain: number;
  /** Largest MRR drop (overall or topic) still read as "no regression". */
  readonly mrrTolerance: number;
}

/** @description The defaults the plan's decision was made with. */
export const DEFAULT_COMPARE_OPTIONS: CompareOptions = {
  minIdentifierMrrGain: 0.05,
  mrrTolerance: 0.01,
};

function summarize(scores: readonly CaseScore[]): ModeSummary {
  return {
    identifier: summarizeScores(scores, 'identifier'),
    overall: summarizeScores(scores, undefined),
    topic: summarizeScores(scores, 'topic'),
  };
}

function hitOutcomes(
  scores: readonly CaseScore[],
): { caseId: string; outcome: 0 | 1 }[] {
  return scores.map((score) => {
    return { caseId: score.caseId, outcome: score.hitAt10 ? 1 : 0 };
  });
}

/**
 * @description Compares `candidate` against `baseline` over the same cases and applies the ship rule. A run
 * whose server answered some case in a different mode (a lexical fallback) never ships: its numbers do not
 * measure the mode it claims.
 */
export function compareSearchModes(
  baseline: ModeRun,
  candidate: ModeRun,
  options: CompareOptions,
): ModeComparison {
  const baselineSummary = summarize(baseline.scores);
  const candidateSummary = summarize(candidate.scores);
  const baselineById = new Map(
    baseline.scores.map((score) => {
      return [score.caseId, score] as const;
    }),
  );
  const rankDrops = candidate.scores
    .flatMap((score) => {
      const before = baselineById.get(score.caseId);
      const isDrop =
        before !== undefined && score.reciprocalRank < before.reciprocalRank;

      if (!isDrop) {
        return [];
      }

      return [
        {
          baselineRank: before.firstRelevantRank,
          candidateRank: score.firstRelevantRank,
          caseId: score.caseId,
          drop: before.reciprocalRank - score.reciprocalRank,
        },
      ];
    })
    .sort((a, b) => b.drop - a.drop)
    .map(({ baselineRank, candidateRank, caseId }) => {
      return { baselineRank, candidateRank, caseId };
    });

  const why: string[] = [];
  const overallDelta =
    candidateSummary.overall.mrr - baselineSummary.overall.mrr;
  const topicDelta = candidateSummary.topic.mrr - baselineSummary.topic.mrr;
  const identifierMrrGain =
    candidateSummary.identifier.mrr - baselineSummary.identifier.mrr;
  const mismatched = [
    ...baseline.mismatchedModeCaseIds,
    ...candidate.mismatchedModeCaseIds,
  ];

  if (mismatched.length > 0) {
    why.push(`server answered in another mode for: ${mismatched.join(', ')}`);
  }

  if (overallDelta < -options.mrrTolerance) {
    why.push(`overall MRR regressed by ${(-overallDelta).toFixed(3)}`);
  }

  if (topicDelta < -options.mrrTolerance) {
    why.push(`topic MRR regressed by ${(-topicDelta).toFixed(3)}`);
  }

  if (candidateSummary.topic.hitAt10 < baselineSummary.topic.hitAt10) {
    why.push('topic hit@10 dropped');
  }

  if (identifierMrrGain < options.minIdentifierMrrGain) {
    why.push(
      `identifier MRR gain ${identifierMrrGain.toFixed(3)} is below ${options.minIdentifierMrrGain}`,
    );
  }

  const ship = why.length === 0;

  if (ship) {
    why.push(`no regression; identifier MRR +${identifierMrrGain.toFixed(3)}`);
  }

  return {
    baseline: baselineSummary,
    candidate: candidateSummary,
    hitAt10Difference: pairedDifference(
      hitOutcomes(baseline.scores),
      hitOutcomes(candidate.scores),
    ),
    identifierMrrGain,
    rankDrops,
    ship,
    why,
  };
}
