import type { McNemarResult } from '../stats/pairedDifference.ts';
import { mcnemar } from '../stats/pairedDifference.ts';
import type { EvalReport } from './report-types.ts';

/**
 * @description The parts of a run's configuration a comparison checks for comparability.
 * @public
 */
export interface ComparableConfig {
  readonly authMode: string;
  readonly datasetId: string;
  readonly datasetVersion: number;
  readonly k: number;
}

/**
 * @description Why two runs are not strictly comparable. The comparison is still computed.
 * @public
 */
export interface ComparisonWarning {
  readonly code:
    'auth_mode_differs' | 'dataset_differs' | 'k_differs' | 'no_shared_cases';
  readonly message: string;
}

/**
 * @description Input of {@link compareEvalReports}: the baseline and the candidate.
 * @public
 */
export interface CompareEvalReportsInput {
  readonly base: {
    readonly config: ComparableConfig;
    readonly report: EvalReport;
  };
  readonly candidate: {
    readonly config: ComparableConfig;
    readonly report: EvalReport;
  };
}

/**
 * @description The paired comparison. `regressedCaseIds` passed in the baseline and failed in the
 * candidate (McNemar's `b`), `improvedCaseIds` the reverse (`c`); `sharedCases` is the number of
 * cases both runs have a case outcome for. `mcnemar` is `null` when no case is shared.
 * @public
 */
export interface EvalComparison {
  readonly improvedCaseIds: readonly string[];
  readonly mcnemar: McNemarResult | null;
  readonly regressedCaseIds: readonly string[];
  readonly sharedCases: number;
  readonly warnings: readonly ComparisonWarning[];
}

const buildWarnings = (
  base: ComparableConfig,
  candidate: ComparableConfig,
  sharedCases: number,
): ComparisonWarning[] => {
  const warnings: ComparisonWarning[] = [];

  if (
    base.datasetId !== candidate.datasetId ||
    base.datasetVersion !== candidate.datasetVersion
  ) {
    warnings.push({
      code: 'dataset_differs',
      message: `The runs used different datasets or dataset versions (${base.datasetId} v${base.datasetVersion} against ${candidate.datasetId} v${candidate.datasetVersion}). Only the case ids both runs share are compared, and the result may not mean what you expect.`,
    });
  }

  if (base.authMode !== candidate.authMode) {
    warnings.push({
      code: 'auth_mode_differs',
      message: `The runs were billed differently (${base.authMode} against ${candidate.authMode}). Costs and rate limits are not comparable.`,
    });
  }

  if (base.k !== candidate.k) {
    warnings.push({
      code: 'k_differs',
      message: `The runs made a different number of attempts per case (k = ${base.k} against k = ${candidate.k}), so pass^k is not comparable.`,
    });
  }

  if (sharedCases === 0) {
    warnings.push({
      code: 'no_shared_cases',
      message: `No case has a counted outcome in both runs, so there is nothing to compare.`,
    });
  }

  return warnings;
};

/**
 * @description Compares a candidate run with a baseline over the cases both have an outcome for
 * (a case passes when every counted attempt passed): McNemar's test on the discordant cases and
 * the regressed and improved case ids. Different datasets, auth modes or k are warned about, not
 * refused.
 * @public
 */
export const compareEvalReports = (
  input: CompareEvalReportsInput,
): EvalComparison => {
  const candidateOutcomes = new Map(
    input.candidate.report.cases.map((row) => {
      return [row.caseId, row.passed] as const;
    }),
  );
  const regressed: string[] = [];
  const improved: string[] = [];
  let shared = 0;

  for (const row of input.base.report.cases) {
    const after = candidateOutcomes.get(row.caseId);

    if (row.passed === null || after === undefined || after === null) {
      continue;
    }

    shared += 1;

    if (row.passed && !after) {
      regressed.push(row.caseId);
    } else if (!row.passed && after) {
      improved.push(row.caseId);
    }
  }

  return {
    improvedCaseIds: improved,
    mcnemar: shared === 0 ? null : mcnemar(regressed.length, improved.length),
    regressedCaseIds: regressed,
    sharedCases: shared,
    warnings: buildWarnings(input.base.config, input.candidate.config, shared),
  };
};
