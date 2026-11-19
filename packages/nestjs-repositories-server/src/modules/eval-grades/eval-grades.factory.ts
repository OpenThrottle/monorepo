/**
 * @description Fishery factory for {@link EvalGrade}. Use in tests to build mock grades.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalGrade } from './eval-grade.entity.ts';
import {
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
} from './eval-grades.constants.ts';

/**
 * Builds a passing code-grader grade. Override any field via `.build({ ... })`.
 * @public
 */
export const evalGradesFactory = Factory.define<EvalGrade>(() => ({
  cacheKey: null,
  costUsd: null,
  createdAt: faker.date.past(),
  errorReason: null,
  evidence: 'matched',
  graderId: 'exact-match',
  graderKind: EVAL_GRADER_KIND.CODE,
  graderVersion: '1',
  id: faker.string.uuid(),
  judgeDriver: null,
  judgeModel: null,
  judgeModelVersion: null,
  trialId: faker.string.uuid(),
  verdict: EVAL_GRADE_VERDICT.PASS,
}));
