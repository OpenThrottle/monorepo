/**
 * @description Maps the EvalRun, EvalTrial and EvalGrade entities to their GraphQL objects,
 * serializing grade evidence into a JSON string.
 */

import type {
  EvalGrade,
  EvalRun,
  EvalTrial,
} from '@openthrottle/nestjs-repositories';

import type { EvalGradeObject } from './eval-grade.object.ts';
import type { EvalRunObject } from './eval-run.object.ts';
import type { EvalTrialObject } from './eval-trial.object.ts';

export const toEvalRunObject = (row: EvalRun): EvalRunObject => {
  return {
    authMode: row.authMode,
    budgetTokens: row.budgetTokens,
    budgetUsd: row.budgetUsd,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    datasetId: row.datasetId,
    datasetVersion: row.datasetVersion,
    driver: row.driver,
    effort: row.effort,
    finishedAt: row.finishedAt,
    id: row.id,
    k: row.k,
    model: row.model,
    promptSha: row.promptSha,
    skillSha: row.skillSha,
    startedAt: row.startedAt,
    status: row.status,
  };
};

export const toEvalTrialObject = (row: EvalTrial): EvalTrialObject => {
  return {
    attempt: row.attempt,
    caseId: row.caseId,
    costUsd: row.costUsd,
    createdAt: row.createdAt,
    durationMs: row.durationMs,
    error: row.error,
    id: row.id,
    runId: row.runId,
    status: row.status,
    trajectoryId: row.trajectoryId,
  };
};

export const toEvalGradeObject = (row: EvalGrade): EvalGradeObject => {
  return {
    cacheKey: row.cacheKey,
    costUsd: row.costUsd,
    createdAt: row.createdAt,
    errorReason: row.errorReason,
    evidenceJson: row.evidence == null ? null : JSON.stringify(row.evidence),
    graderId: row.graderId,
    graderKind: row.graderKind,
    graderVersion: row.graderVersion,
    id: row.id,
    judgeDriver: row.judgeDriver,
    judgeModel: row.judgeModel,
    judgeModelVersion: row.judgeModelVersion,
    trialId: row.trialId,
    verdict: row.verdict,
  };
};
