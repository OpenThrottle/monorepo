/**
 * @description Fishery factories for {@link EvalRun}, {@link EvalTrial} and {@link EvalGrade}. Use
 * in tests to build mock eval rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalGrade } from './eval-grade.entity.ts';
import type { EvalRun } from './eval-run.entity.ts';
import {
  EVAL_AUTH_MODE,
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
  EVAL_RUN_STATUS,
  EVAL_TRIAL_STATUS,
} from './eval-runs.constants.ts';
import type { EvalTrial } from './eval-trial.entity.ts';

/**
 * Builds a pending subscription-auth run with k = 1. Override any field via
 * `.build({ status: EVAL_RUN_STATUS.RUNNING })`.
 * @public
 */
export const evalRunFactory = Factory.define<EvalRun>(() => ({
  authMode: EVAL_AUTH_MODE.SUBSCRIPTION,
  budgetTokens: null,
  budgetUsd: null,
  createdAt: faker.date.past(),
  createdBy: 'visormatt',
  datasetId: faker.string.uuid(),
  datasetVersion: 1,
  driver: 'claude',
  effort: null,
  finishedAt: null,
  id: faker.string.uuid(),
  k: 1,
  model: null,
  promptSha: null,
  skillSha: null,
  startedAt: null,
  status: EVAL_RUN_STATUS.PENDING,
}));

/**
 * Builds a completed first attempt with no trajectory. Override any field via `.build({ ... })`.
 * @public
 */
export const evalTrialFactory = Factory.define<EvalTrial>(() => ({
  attempt: 1,
  caseId: faker.string.uuid(),
  costUsd: null,
  createdAt: faker.date.past(),
  durationMs: faker.number.int({ max: 600_000, min: 1_000 }),
  error: null,
  id: faker.string.uuid(),
  runId: faker.string.uuid(),
  status: EVAL_TRIAL_STATUS.COMPLETED,
  trajectoryId: null,
}));

/**
 * Builds a passing code-grader grade. Override any field via `.build({ ... })`.
 * @public
 */
export const evalGradeFactory = Factory.define<EvalGrade>(() => ({
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
