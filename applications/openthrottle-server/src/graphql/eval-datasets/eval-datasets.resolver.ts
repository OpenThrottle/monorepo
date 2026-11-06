/**
 * @description Resolver for eval datasets (eval_datasets, eval_cases): list a repository's
 * datasets, read one with its cases, and create a dataset from recorded trajectories (real
 * failures become cases). See docs/openthrottle/eval-system-adr.md (Decision 6). The creator is
 * always derived from the caller's identity, never from input.
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
  AgentTrajectoriesService,
  type AgentTrajectory,
  type CreateEvalCaseInput,
  EVAL_DATASET_TARGET,
  EVAL_SPLIT,
  EvalDatasetsService,
  type EvalDatasetTarget,
  type EvalSplit,
} from '@openthrottle/nestjs-repositories';

import { CreateEvalDatasetFromTrajectoriesInput } from './create-eval-dataset-from-trajectories.input.ts';
import { EvalCaseObject } from './eval-case.object.ts';
import type { EvalCaseFromTrajectoryInput } from './eval-case-from-trajectory.input.ts';
import {
  toEvalCaseObject,
  toEvalDatasetObject,
} from './eval-dataset.mapper.ts';
import { EvalDatasetObject } from './eval-dataset.object.ts';
import {
  isForeignKeyViolation,
  parseEvalJson,
  resolveEvalActor,
} from './eval-datasets.utils.ts';

const isEvalDatasetTarget = (value: string): value is EvalDatasetTarget => {
  return (
    value === EVAL_DATASET_TARGET.MCP_TOOL_SELECTION ||
    value === EVAL_DATASET_TARGET.PLAN_TASK ||
    value === EVAL_DATASET_TARGET.SKILL
  );
};

const isEvalSplit = (value: string): value is EvalSplit => {
  return value === EVAL_SPLIT.DEV || value === EVAL_SPLIT.TEST;
};

const trimToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();

  return trimmed == null || trimmed === '' ? null : trimmed;
};

const deriveCaseInput = (trajectory: AgentTrajectory): unknown => {
  return {
    driver: trajectory.driver,
    model: trajectory.model,
    planRunId: trajectory.planRunId,
    taskId: trajectory.taskId,
    trajectoryId: trajectory.id,
  };
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => EvalDatasetObject)
export class EvalDatasetsResolver {
  constructor(
    private readonly agentTrajectoriesService: AgentTrajectoriesService,
    private readonly evalDatasetsService: EvalDatasetsService,
    private readonly globalCls: GlobalClsService,
  ) {}

  @ResolveField(() => [EvalCaseObject], {
    description: `The dataset's cases, oldest first.`,
  })
  async cases(@Parent() dataset: EvalDatasetObject): Promise<EvalCaseObject[]> {
    const rows = await this.evalDatasetsService.findCases(dataset.id);

    return rows.map(toEvalCaseObject);
  }

  @Query(() => EvalDatasetObject, {
    description: `Fetch one eval dataset by id. Null when it does not exist.`,
    nullable: true,
  })
  async evalDataset(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<EvalDatasetObject | null> {
    const row = await this.evalDatasetsService.findById(id);

    return row == null ? null : toEvalDatasetObject(row);
  }

  @Query(() => [EvalDatasetObject], {
    description: `List a repository's eval datasets, newest first.`,
  })
  async evalDatasets(
    @Args('repositoryId', { type: () => ID }) repositoryId: string,
  ): Promise<EvalDatasetObject[]> {
    const rows = await this.evalDatasetsService.findByRepository(repositoryId);

    return rows.map(toEvalDatasetObject);
  }

  @Mutation(() => EvalDatasetObject, {
    description: `Create an eval dataset from recorded trajectories: each selected trajectory (typically a real failure) becomes a case with its gold answer. Re-using a name in the repository creates the next version. The creator is taken from your identity, never from input.`,
  })
  async createEvalDatasetFromTrajectories(
    @Args('input', { type: () => CreateEvalDatasetFromTrajectoriesInput })
    input: CreateEvalDatasetFromTrajectoriesInput,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<EvalDatasetObject> {
    const target = input.target.trim();

    if (!isEvalDatasetTarget(target)) {
      throw new BadRequestException(
        `target must be '${EVAL_DATASET_TARGET.PLAN_TASK}', '${EVAL_DATASET_TARGET.SKILL}' or '${EVAL_DATASET_TARGET.MCP_TOOL_SELECTION}'`,
      );
    }

    const name = trimToNull(input.name);

    if (name == null) {
      throw new BadRequestException('name must not be blank');
    }

    if (input.cases.length === 0) {
      throw new BadRequestException('cases must contain at least one case');
    }

    const createdBy = resolveEvalActor(this.globalCls.get('user'), principal);

    const trajectories = await Promise.all(
      input.cases.map((evalCase) => {
        return this.agentTrajectoriesService.findById(evalCase.trajectoryId);
      }),
    );

    const cases = input.cases.map((evalCase, index) => {
      return this.buildCase(evalCase, trajectories[index]);
    });

    try {
      const row = await this.evalDatasetsService.create({
        cases,
        createdBy,
        description: trimToNull(input.description),
        name,
        repositoryId: input.repositoryId,
        target,
      });

      return toEvalDatasetObject(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('repository or trajectory not found');
      }

      throw error;
    }
  }

  private buildCase(
    evalCase: EvalCaseFromTrajectoryInput,
    trajectory: AgentTrajectory | null | undefined,
  ): CreateEvalCaseInput {
    const split = evalCase.split.trim();

    if (!isEvalSplit(split)) {
      throw new BadRequestException(
        `split must be '${EVAL_SPLIT.DEV}' or '${EVAL_SPLIT.TEST}'`,
      );
    }

    if (trajectory == null) {
      throw new NotFoundException(
        `trajectory ${evalCase.trajectoryId} not found`,
      );
    }

    const hasInput = evalCase.inputJson != null;
    const input = hasInput
      ? parseEvalJson('inputJson', evalCase.inputJson ?? '')
      : deriveCaseInput(trajectory);

    return {
      gold: parseEvalJson('goldJson', evalCase.goldJson),
      input,
      sourceTrajectoryId: trajectory.id,
      split,
    };
  }
}
