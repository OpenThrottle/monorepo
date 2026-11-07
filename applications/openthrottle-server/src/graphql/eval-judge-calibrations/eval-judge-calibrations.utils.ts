/**
 * @description Helpers for the judge-calibration resolver: narrowing the API strings to the
 * repository value sets and mapping stored judge grades to agentic-evals verdicts.
 */

import { BadRequestException } from '@nestjs/common';
import type { GraderVerdict } from '@openthrottle/agentic-evals';
import {
  EVAL_CALIBRATION_STATUS,
  EVAL_GRADE_VERDICT,
  EVAL_SPLIT,
  type EvalCalibrationStatus,
  type EvalJudgePair,
  type EvalSplit,
} from '@openthrottle/nestjs-repositories';

export const isEvalCalibrationStatus = (
  value: string,
): value is EvalCalibrationStatus => {
  return (
    value === EVAL_CALIBRATION_STATUS.GATING ||
    value === EVAL_CALIBRATION_STATUS.INSUFFICIENT ||
    value === EVAL_CALIBRATION_STATUS.NON_GATING ||
    value === EVAL_CALIBRATION_STATUS.UNSUPERVISED
  );
};

export const isEvalSplit = (value: string): value is EvalSplit => {
  return value === EVAL_SPLIT.DEV || value === EVAL_SPLIT.TEST;
};

/**
 * @description Reads an optional split argument: blank is null, dev and test pass through, anything
 * else is a bad request.
 */
export const parseOptionalSplit = (value: string | null): EvalSplit | null => {
  const trimmed = value?.trim();

  if (trimmed == null || trimmed === '') return null;

  if (!isEvalSplit(trimmed)) {
    throw new BadRequestException(`split must be 'dev' or 'test'`);
  }

  return trimmed;
};

export const isUnitInterval = (value: number | null): boolean => {
  return value === null || (value >= 0 && value <= 1);
};

const stringifyEvidence = (evidence: unknown): string => {
  return typeof evidence === 'string' ? evidence : JSON.stringify(evidence);
};

/**
 * @description Turns a stored judge grade into the agentic-evals verdict the calibration reads.
 * An error grade becomes an error verdict, which the calibration excludes and counts.
 */
export const toGraderVerdict = (pair: EvalJudgePair): GraderVerdict => {
  if (pair.judge === EVAL_GRADE_VERDICT.ERROR) {
    return { kind: 'error', reason: pair.errorReason ?? 'judge error' };
  }

  const evidence = stringifyEvidence(pair.evidence);

  return pair.judge === EVAL_GRADE_VERDICT.PASS
    ? { evidence, kind: 'pass' }
    : { evidence, kind: 'fail' };
};
