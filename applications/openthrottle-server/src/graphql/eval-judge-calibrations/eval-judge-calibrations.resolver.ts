/**
 * @description Resolver for judge calibrations (eval_judge_calibrations): record one, list a
 * grader's history, and calibrate a judge over a run in one call (pair the run's judge grades with
 * human labels, compute kappa, catch rate and false-fail rate with agentic-evals, record the
 * row). See docs/openthrottle/eval-system-adr.md (Decision 9). The creator is always derived from
 * the caller's identity, never from input.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { calibrateJudge } from '@openthrottle/agentic-evals';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  EvalJudgeCalibrationsService,
  EvalRunsService,
} from '@openthrottle/nestjs-repositories';

import {
  isForeignKeyViolation,
  resolveEvalActor,
} from '../eval-datasets/eval-datasets.utils.ts';
import { CalibrateJudgeForRunInput } from './calibrate-judge-for-run.input.ts';
import { toEvalJudgeCalibrationObject } from './eval-judge-calibration.mapper.ts';
import {
  CalibrateJudgeForRunResultObject,
  EvalJudgeCalibrationObject,
} from './eval-judge-calibration.object.ts';
import {
  isEvalCalibrationStatus,
  isUnitInterval,
  parseOptionalSplit,
  toGraderVerdict,
} from './eval-judge-calibrations.utils.ts';
import { RecordJudgeCalibrationInput } from './record-judge-calibration.input.ts';

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed == null || trimmed === '' ? null : trimmed;
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => EvalJudgeCalibrationObject)
export class EvalJudgeCalibrationsResolver {
  constructor(
    private readonly evalJudgeCalibrationsService: EvalJudgeCalibrationsService,
    private readonly evalRunsService: EvalRunsService,
    private readonly globalCls: GlobalClsService,
  ) {}

  @Query(() => [EvalJudgeCalibrationObject], {
    description: `List a grader's judge calibrations across versions, newest first.`,
  })
  async judgeCalibrations(
    @Args('graderId', { type: () => String }) graderId: string,
  ): Promise<EvalJudgeCalibrationObject[]> {
    const rows = await this.evalJudgeCalibrationsService.findByGrader(graderId);

    return rows.map(toEvalJudgeCalibrationObject);
  }

  @Mutation(() => EvalJudgeCalibrationObject, {
    description: `Record a judge calibration whose statistics were computed elsewhere. History is append-only. The creator is read from your identity, never from input.`,
  })
  async recordJudgeCalibration(
    @Args('input', { type: () => RecordJudgeCalibrationInput })
    input: RecordJudgeCalibrationInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<EvalJudgeCalibrationObject> {
    const status = input.status.trim();
    const split = parseOptionalSplit(input.split);
    const judgeModel = trimToNull(input.judgeModel);
    const graderId = trimToNull(input.graderId);
    const graderVersion = trimToNull(input.graderVersion);

    if (!isEvalCalibrationStatus(status)) {
      throw new BadRequestException(
        `status '${status}' is not a calibration status`,
      );
    }

    if (graderId == null || graderVersion == null) {
      throw new BadRequestException(
        'graderId and graderVersion must not be blank',
      );
    }

    if (judgeModel == null) {
      throw new BadRequestException('judgeModel must not be blank');
    }

    if (split != null && input.datasetId == null) {
      throw new BadRequestException('split needs a datasetId');
    }

    if (input.n < 0 || input.nExcluded < 0) {
      throw new BadRequestException('n and nExcluded must not be negative');
    }

    if (
      !isUnitInterval(input.catchRate) ||
      !isUnitInterval(input.falseFailRate)
    ) {
      throw new BadRequestException(
        'catchRate and falseFailRate must be between 0 and 1',
      );
    }

    const createdBy = resolveEvalActor(this.globalCls.get('user'), principal);

    try {
      const row = await this.evalJudgeCalibrationsService.record({
        catchRate: input.catchRate,
        createdBy,
        datasetId: input.datasetId,
        falseFailRate: input.falseFailRate,
        graderId,
        graderVersion,
        heldOut: input.heldOut,
        judgeDriver: trimToNull(input.judgeDriver),
        judgeModel,
        judgeModelVersion: trimToNull(input.judgeModelVersion),
        kappa: input.kappa,
        kappaCiHigh: input.kappaCiHigh,
        kappaCiLow: input.kappaCiLow,
        n: input.n,
        nExcluded: input.nExcluded,
        runId: input.runId,
        split,
        status,
      });

      return toEvalJudgeCalibrationObject(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('dataset or run not found');
      }

      throw error;
    }
  }

  @Mutation(() => CalibrateJudgeForRunResultObject, {
    description: `Calibrate a judge over one run in one call: pair its judge grades with human labels on the trials' trajectories, compute kappa (bootstrap 95% CI), catch rate, false-fail rate and gating status, and record the row. Judge error verdicts are excluded and counted separately.`,
  })
  async calibrateJudgeForRun(
    @Args('input', { type: () => CalibrateJudgeForRunInput })
    input: CalibrateJudgeForRunInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<CalibrateJudgeForRunResultObject> {
    const split = parseOptionalSplit(input.split);
    const createdBy = resolveEvalActor(this.globalCls.get('user'), principal);
    const run = await this.evalRunsService.findRunById(input.runId);

    if (run == null) {
      throw new NotFoundException('eval run not found');
    }

    const found = await this.evalJudgeCalibrationsService.findJudgePairs({
      graderId: input.graderId,
      graderVersion: input.graderVersion,
      runId: run.id,
      split,
    });
    const [judge, ...otherJudges] = found.judges;

    if (judge == null) {
      throw new BadRequestException(
        'the run has no judge grades for that grader id and version',
      );
    }

    if (otherJudges.length > 0) {
      throw new BadRequestException(
        'the grades were produced by more than one judge model; calibrate one judge at a time',
      );
    }

    const result = calibrateJudge({
      pairs: found.pairs.map((pair) => {
        return {
          human: pair.human,
          judge: toGraderVerdict(pair),
          subjectId: pair.subjectId,
        };
      }),
    });
    const row = await this.evalJudgeCalibrationsService.record({
      catchRate: result.catchRate,
      createdBy,
      datasetId: run.datasetId,
      falseFailRate: result.falseFailRate,
      graderId: input.graderId,
      graderVersion: input.graderVersion,
      heldOut: input.heldOut,
      judgeDriver: judge.driver,
      judgeModel: judge.model,
      judgeModelVersion: judge.modelVersion,
      kappa: result.kappa,
      kappaCiHigh: result.kappaCiHigh,
      kappaCiLow: result.kappaCiLow,
      n: result.n,
      nExcluded: result.nExcluded,
      runId: run.id,
      split,
      status: result.status,
    });

    return {
      calibration: toEvalJudgeCalibrationObject(row),
      nConflicted: found.nConflicted,
      nUnlabeled: found.nUnlabeled,
    };
  }
}
