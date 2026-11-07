/**
 * @description Resolver for eval runs (eval_runs, eval_trials, eval_grades): read a dataset's runs
 * and one run with its trials and grades, and the mutations the agentic-evals runner uses to
 * persist a run, its trials and its grades. See docs/openthrottle/eval-system-adr.md (Decisions 6,
 * 8 and 9). The run creator is always derived from the caller's identity, never from input.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { type AuthPrincipal, CurrentUser } from '@openthrottle/nestjs-auth';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  EVAL_AUTH_MODE,
  EVAL_GRADE_VERDICT,
  EVAL_GRADER_KIND,
  EVAL_RUN_STATUS,
  EVAL_TRIAL_STATUS,
  type EvalAuthMode,
  EvalDatasetsService,
  type EvalGraderKind,
  type EvalGradeVerdict,
  EvalRunsService,
  type EvalRunStatus,
  type EvalTrialStatus,
} from '@openthrottle/nestjs-repositories';

import {
  isForeignKeyViolation,
  parseEvalJson,
  resolveEvalActor,
} from '../eval-datasets/eval-datasets.utils.ts';
import { EvalGradeObject } from './eval-grade.object.ts';
import {
  toEvalGradeObject,
  toEvalRunObject,
  toEvalTrialObject,
} from './eval-run.mapper.ts';
import { EvalRunObject } from './eval-run.object.ts';
import { EvalTrialObject } from './eval-trial.object.ts';
import { RecordEvalGradeInput } from './record-eval-grade.input.ts';
import { RecordEvalRunInput } from './record-eval-run.input.ts';
import { RecordEvalTrialInput } from './record-eval-trial.input.ts';
import { UpdateEvalRunStatusInput } from './update-eval-run-status.input.ts';

const isEvalAuthMode = (value: string): value is EvalAuthMode => {
  return (
    value === EVAL_AUTH_MODE.API_KEY || value === EVAL_AUTH_MODE.SUBSCRIPTION
  );
};

const isEvalRunStatus = (value: string): value is EvalRunStatus => {
  return (
    value === EVAL_RUN_STATUS.CANCELLED ||
    value === EVAL_RUN_STATUS.COMPLETED ||
    value === EVAL_RUN_STATUS.FAILED ||
    value === EVAL_RUN_STATUS.PENDING ||
    value === EVAL_RUN_STATUS.RUNNING ||
    value === EVAL_RUN_STATUS.USAGE_LIMITED
  );
};

const isEvalTrialStatus = (value: string): value is EvalTrialStatus => {
  return (
    value === EVAL_TRIAL_STATUS.COMPLETED ||
    value === EVAL_TRIAL_STATUS.ERRORED ||
    value === EVAL_TRIAL_STATUS.USAGE_LIMITED
  );
};

const isEvalGraderKind = (value: string): value is EvalGraderKind => {
  return (
    value === EVAL_GRADER_KIND.CODE ||
    value === EVAL_GRADER_KIND.HUMAN ||
    value === EVAL_GRADER_KIND.JUDGE
  );
};

const isEvalGradeVerdict = (value: string): value is EvalGradeVerdict => {
  return (
    value === EVAL_GRADE_VERDICT.ERROR ||
    value === EVAL_GRADE_VERDICT.FAIL ||
    value === EVAL_GRADE_VERDICT.PASS
  );
};

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed == null || trimmed === '' ? null : trimmed;
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => EvalRunObject)
export class EvalRunsResolver {
  constructor(
    private readonly evalDatasetsService: EvalDatasetsService,
    private readonly evalRunsService: EvalRunsService,
    private readonly globalCls: GlobalClsService,
  ) {}

  @ResolveField(() => [EvalTrialObject], {
    description: `The run's trials ordered by attempt.`,
  })
  async trials(@Parent() run: EvalRunObject): Promise<EvalTrialObject[]> {
    const rows = await this.evalRunsService.findTrialsByRun(run.id);

    return rows.map(toEvalTrialObject);
  }

  @Query(() => EvalRunObject, {
    description: `Fetch one eval run by id. Null when it does not exist.`,
    nullable: true,
  })
  async evalRun(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<EvalRunObject | null> {
    const row = await this.evalRunsService.findRunById(id);

    return row == null ? null : toEvalRunObject(row);
  }

  @Query(() => [EvalRunObject], {
    description: `List a dataset's eval runs, newest first.`,
  })
  async evalRuns(
    @Args('datasetId', { type: () => ID }) datasetId: string,
  ): Promise<EvalRunObject[]> {
    const rows = await this.evalRunsService.findRunsByDataset(datasetId);

    return rows.map(toEvalRunObject);
  }

  @Mutation(() => EvalRunObject, {
    description: `Record an eval run over a dataset. The dataset version is read from the dataset and the creator from your identity, never from input.`,
  })
  async recordEvalRun(
    @Args('input', { type: () => RecordEvalRunInput })
    input: RecordEvalRunInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<EvalRunObject> {
    const authMode = input.authMode.trim();

    if (!isEvalAuthMode(authMode)) {
      throw new BadRequestException(
        `authMode must be '${EVAL_AUTH_MODE.API_KEY}' or '${EVAL_AUTH_MODE.SUBSCRIPTION}'`,
      );
    }

    const status = trimToNull(input.status) ?? EVAL_RUN_STATUS.PENDING;

    if (!isEvalRunStatus(status)) {
      throw new BadRequestException(`status '${status}' is not a run status`);
    }

    const driver = trimToNull(input.driver);

    if (driver == null) {
      throw new BadRequestException('driver must not be blank');
    }

    if (input.k < 1) {
      throw new BadRequestException('k must be at least 1');
    }

    const createdBy = resolveEvalActor(this.globalCls.get('user'), principal);
    const dataset = await this.evalDatasetsService.findById(input.datasetId);

    if (dataset == null) {
      throw new NotFoundException('dataset not found');
    }

    const row = await this.evalRunsService.createRun({
      authMode,
      budgetTokens: input.budgetTokens,
      budgetUsd: input.budgetUsd,
      createdBy,
      datasetId: dataset.id,
      datasetVersion: dataset.version,
      driver,
      effort: trimToNull(input.effort),
      k: input.k,
      model: trimToNull(input.model),
      promptSha: trimToNull(input.promptSha),
      skillSha: trimToNull(input.skillSha),
      status,
    });

    return toEvalRunObject(row);
  }

  @Mutation(() => EvalRunObject, {
    description: `Move an eval run to a new status. startedAt is stamped the first time it runs; finishedAt on completed, failed or cancelled, and cleared when a paused run resumes.`,
  })
  async updateEvalRunStatus(
    @Args('input', { type: () => UpdateEvalRunStatusInput })
    input: UpdateEvalRunStatusInput,
  ): Promise<EvalRunObject> {
    const status = input.status.trim();

    if (!isEvalRunStatus(status)) {
      throw new BadRequestException(`status '${status}' is not a run status`);
    }

    const row = await this.evalRunsService.updateRunStatus({
      runId: input.runId,
      status,
    });

    if (row == null) {
      throw new NotFoundException('eval run not found');
    }

    return toEvalRunObject(row);
  }

  @Mutation(() => EvalTrialObject, {
    description: `Record one attempt at one case. Re-recording the same run, case and attempt replaces the earlier row, so a resumed run can re-record a usage_limited trial.`,
  })
  async recordEvalTrial(
    @Args('input', { type: () => RecordEvalTrialInput })
    input: RecordEvalTrialInput,
  ): Promise<EvalTrialObject> {
    const status = input.status.trim();

    if (!isEvalTrialStatus(status)) {
      throw new BadRequestException(
        `status must be '${EVAL_TRIAL_STATUS.COMPLETED}', '${EVAL_TRIAL_STATUS.ERRORED}' or '${EVAL_TRIAL_STATUS.USAGE_LIMITED}'`,
      );
    }

    if (input.attempt < 1) {
      throw new BadRequestException('attempt must be at least 1');
    }

    try {
      const row = await this.evalRunsService.upsertTrial({
        attempt: input.attempt,
        caseId: input.caseId,
        costUsd: input.costUsd,
        durationMs: input.durationMs,
        error: trimToNull(input.error),
        runId: input.runId,
        status,
        trajectoryId: input.trajectoryId,
      });

      return toEvalTrialObject(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('run, case or trajectory not found');
      }

      throw error;
    }
  }

  @Mutation(() => EvalGradeObject, {
    description: `Record one grader's verdict on a trial with the grader id and version and, for judges, the judge model. An error verdict needs errorReason; a judge needs judgeModel. Re-recording the same trial, grader id and version replaces the earlier row.`,
  })
  async recordEvalGrade(
    @Args('input', { type: () => RecordEvalGradeInput })
    input: RecordEvalGradeInput,
  ): Promise<EvalGradeObject> {
    const graderKind = input.graderKind.trim();
    const verdict = input.verdict.trim();

    if (!isEvalGraderKind(graderKind)) {
      throw new BadRequestException(
        `graderKind must be '${EVAL_GRADER_KIND.CODE}', '${EVAL_GRADER_KIND.JUDGE}' or '${EVAL_GRADER_KIND.HUMAN}'`,
      );
    }

    if (!isEvalGradeVerdict(verdict)) {
      throw new BadRequestException(
        `verdict must be '${EVAL_GRADE_VERDICT.PASS}', '${EVAL_GRADE_VERDICT.FAIL}' or '${EVAL_GRADE_VERDICT.ERROR}'`,
      );
    }

    const errorReason = trimToNull(input.errorReason);
    const judgeModel = trimToNull(input.judgeModel);

    if ((verdict === EVAL_GRADE_VERDICT.ERROR) !== (errorReason != null)) {
      throw new BadRequestException(
        'errorReason is required when the verdict is error, and only then',
      );
    }

    if (graderKind === EVAL_GRADER_KIND.JUDGE && judgeModel == null) {
      throw new BadRequestException('judgeModel is required for a judge grade');
    }

    const evidenceJson = input.evidenceJson;
    const hasEvidence = evidenceJson != null;
    const evidence = hasEvidence
      ? parseEvalJson('evidenceJson', evidenceJson)
      : null;

    try {
      const row = await this.evalRunsService.upsertGrade({
        cacheKey: trimToNull(input.cacheKey),
        costUsd: input.costUsd,
        errorReason,
        evidence,
        graderId: input.graderId,
        graderKind,
        graderVersion: input.graderVersion,
        judgeDriver: trimToNull(input.judgeDriver),
        judgeModel,
        judgeModelVersion: trimToNull(input.judgeModelVersion),
        trialId: input.trialId,
        verdict,
      });

      return toEvalGradeObject(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('trial not found');
      }

      throw error;
    }
  }
}
