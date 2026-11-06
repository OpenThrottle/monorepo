/**
 * @description Fishery factory for {@link EvalJudgeCalibration}. Use in tests to build mock
 * calibration rows.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { EvalJudgeCalibration } from './eval-judge-calibration.entity.ts';
import { EVAL_CALIBRATION_STATUS } from './eval-judge-calibrations.constants.ts';

/**
 * Builds a gating calibration of a judge over 20 pairs. Override any field via
 * `.build({ status: EVAL_CALIBRATION_STATUS.NON_GATING })`.
 * @public
 */
export const evalJudgeCalibrationFactory = Factory.define<EvalJudgeCalibration>(
  () => ({
    catchRate: 0.75,
    createdAt: faker.date.past(),
    createdBy: 'visormatt',
    datasetId: null,
    falseFailRate: 1 / 12,
    graderId: 'plan-in-markdown',
    graderVersion: '1',
    heldOut: false,
    id: faker.string.uuid(),
    judgeDriver: 'claude',
    judgeModel: 'claude-opus-4-8',
    judgeModelVersion: null,
    kappa: 0.68,
    kappaCiHigh: 0.9,
    kappaCiLow: 0.4,
    n: 20,
    nExcluded: 0,
    runId: null,
    split: null,
    status: EVAL_CALIBRATION_STATUS.GATING,
  }),
);
