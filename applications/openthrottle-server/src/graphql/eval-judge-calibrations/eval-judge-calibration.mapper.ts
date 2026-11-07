/**
 * @description Maps the EvalJudgeCalibration entity to its GraphQL object.
 */

import type { EvalJudgeCalibration } from '@openthrottle/nestjs-repositories';

import type { EvalJudgeCalibrationObject } from './eval-judge-calibration.object.ts';

export const toEvalJudgeCalibrationObject = (
  row: EvalJudgeCalibration,
): EvalJudgeCalibrationObject => {
  return {
    catchRate: row.catchRate,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    datasetId: row.datasetId,
    falseFailRate: row.falseFailRate,
    graderId: row.graderId,
    graderVersion: row.graderVersion,
    heldOut: row.heldOut,
    id: row.id,
    judgeDriver: row.judgeDriver,
    judgeModel: row.judgeModel,
    judgeModelVersion: row.judgeModelVersion,
    kappa: row.kappa,
    kappaCiHigh: row.kappaCiHigh,
    kappaCiLow: row.kappaCiLow,
    n: row.n,
    nExcluded: row.nExcluded,
    runId: row.runId,
    split: row.split,
    status: row.status,
  };
};
