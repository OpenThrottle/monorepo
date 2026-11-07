import {
  EVAL_COMPARE_COPY,
  EVAL_REPORT_COPY,
  EVAL_RUNS_COPY,
  EVAL_STAT_COPY,
} from '~/routing/evals/data/data.copy';
import { formatTrajectoryCost } from '~/routing/evals/utils/formatters';

const SIGNIFICANCE_LEVEL = 0.05;

const toPercent = (rate: number): string => {
  return `${(rate * 100).toFixed(0)}%`;
};

/**
 * @description A 0..1 rate as a whole percent; the dash when unknown.
 */
export const formatRate = (rate: number | null | undefined): string => {
  if (rate == null) {
    return EVAL_STAT_COPY.noValue;
  }

  return toPercent(rate);
};

/**
 * @description An interval as `lower–upper` percent; empty when unknown.
 */
export const formatRateInterval = (
  interval:
    { readonly lower: number; readonly upper: number } | null | undefined,
): string => {
  if (interval == null) {
    return '';
  }

  return `${toPercent(interval.lower)}–${toPercent(interval.upper)}`;
};

/**
 * @description A kappa to two decimals; the dash when it is undefined.
 */
export const formatKappa = (kappa: number | null | undefined): string => {
  if (kappa == null) {
    return EVAL_STAT_COPY.noValue;
  }

  return kappa.toFixed(2);
};

/**
 * @description A kappa interval as `low–high`; empty when unknown.
 */
export const formatKappaInterval = (
  low: number | null | undefined,
  high: number | null | undefined,
): string => {
  if (low == null || high == null) {
    return '';
  }

  return `${low.toFixed(2)}–${high.toFixed(2)}`;
};

/**
 * @description The detection floor as `± N points` of pass rate.
 */
export const formatDetectionFloor = (
  floor: number | null | undefined,
): string => {
  if (floor == null) {
    return EVAL_STAT_COPY.noValue;
  }

  return `± ${(floor * 100).toFixed(0)} ${EVAL_STAT_COPY.pointsSuffix}`;
};

/**
 * @description Cost per success in USD; a null cost reads as unpriced, never zero.
 */
export const formatCostPerSuccess = (
  costUsd: number | null | undefined,
): string => {
  return formatTrajectoryCost(costUsd);
};

/**
 * @description The first eight characters of a SHA or id, for a table cell.
 */
export const shortId = (value: string | null | undefined): string => {
  if (value == null || value === '') {
    return EVAL_REPORT_COPY.notSet;
  }

  return value.slice(0, 8);
};

const pluralCases = (count: number): string => {
  return count === 1 ? `1 case` : `${count} cases`;
};

/**
 * @description McNemar's result in plain words, for example "3 cases got worse,
 * 1 got better, p = 0.62 — not significant at this size".
 */
export const describeMcNemar = (result: {
  readonly b: number;
  readonly c: number;
  readonly pValue: number;
}): string => {
  const isSignificant = result.pValue < SIGNIFICANCE_LEVEL;
  const verdict = isSignificant
    ? EVAL_COMPARE_COPY.significant
    : EVAL_COMPARE_COPY.notSignificant;

  const pText =
    result.pValue < 0.01 ? 'p < 0.01' : `p = ${result.pValue.toFixed(2)}`;

  return `${pluralCases(result.b)} got worse, ${result.c} got better, ${pText} — ${verdict}`;
};

/**
 * @description A timestamp as `YYYY-MM-DD HH:mm UTC`. Deterministic, so the server and
 * the client render the same text.
 */
export const formatEvalTimestamp = (
  value: string | number | Date | null | undefined,
): string => {
  if (value == null) {
    return EVAL_REPORT_COPY.notSet;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return EVAL_REPORT_COPY.notSet;
  }

  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

/**
 * @description One line naming a run's configuration: driver, model and effort.
 */
export const describeRunConfig = (run: {
  readonly driver: string;
  readonly effort?: string | null;
  readonly model?: string | null;
}): string => {
  const parts = [run.driver, run.model ?? EVAL_RUNS_COPY.unknownModel];

  if (run.effort != null && run.effort !== '') {
    parts.push(run.effort);
  }

  return parts.join(' · ');
};

/**
 * @description Sort rank of a case result: failed first, then passed, then not counted.
 */
export const caseResultRank = (passed: boolean | null | undefined): number => {
  if (passed === false) {
    return 0;
  }

  return passed === true ? 1 : 2;
};

/**
 * @description The badge colour and label of a case result.
 */
export const describeCaseResult = (
  passed: boolean | null | undefined,
): { readonly color: 'green' | 'red' | 'slate'; readonly label: string } => {
  if (passed === true) {
    return { color: 'green', label: EVAL_REPORT_COPY.casePassed };
  }

  if (passed === false) {
    return { color: 'red', label: EVAL_REPORT_COPY.caseFailed };
  }

  return { color: 'slate', label: EVAL_REPORT_COPY.caseNotCounted };
};
