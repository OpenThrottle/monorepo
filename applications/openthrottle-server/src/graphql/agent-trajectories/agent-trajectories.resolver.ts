/**
 * @description Resolver for agent trajectories (agent_trajectories): record one ATIF document for
 * a plan run and read them back by id, plan run or task. Recording validates the document, applies
 * the server-side size backstop and derives the summary columns; see
 * docs/openthrottle/eval-system-adr.md.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import type {
  AgentTrajectoryScoreStateValue,
  AgentTrajectorySource,
} from '@openthrottle/nestjs-repositories-server';
import {
  AGENT_TRAJECTORY_SOURCE,
  AgentTrajectoriesRepository,
  PlanRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  capTrajectory,
  parseAtifTrajectoryJson,
  summarizeTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';
import { QueryFailedError } from 'typeorm';

import { resolveLabelRater } from '../eval-human-labels/eval-human-labels.utils.ts';
import {
  RecordAgentTrajectoryInput,
  ReplaceAgentTrajectoryInput,
} from './agent-trajectory.input.ts';
import {
  toAgentTrajectoryObject,
  toAgentTrajectoryPlanGroupPageObject,
} from './agent-trajectory.mapper.ts';
import { AgentTrajectoryObject } from './agent-trajectory.object.ts';
import { AgentTrajectoryPlanGroupPageObject } from './agent-trajectory-plan-group.object.ts';
import { AgentTrajectoryScoreState } from './agent-trajectory-score-state.enum.ts';

const FOREIGN_KEY_VIOLATION = '23503';
const MAX_IDEMPOTENCY_KEY_LENGTH = 200;
const DEFAULT_PLAN_GROUPS_PAGE_SIZE = 20;
const MAX_PLAN_GROUPS_PAGE_SIZE = 50;

const isAgentTrajectorySource = (
  value: string,
): value is AgentTrajectorySource => {
  return (
    value === AGENT_TRAJECTORY_SOURCE.SESSION_UPLOAD ||
    value === AGENT_TRAJECTORY_SOURCE.SPAWNED
  );
};

const isForeignKeyViolation = (error: unknown): boolean => {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError: unknown = error.driverError;

  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === FOREIGN_KEY_VIOLATION
  );
};

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => AgentTrajectoryObject)
export class AgentTrajectoriesResolver {
  constructor(
    private readonly agentTrajectoriesRepository: AgentTrajectoriesRepository,
    private readonly globalCls: GlobalClsService,
    private readonly planRunsRepository: PlanRunsRepository,
  ) {}

  @ResolveField('planId', () => ID, {
    description: `Plan the trajectory's plan run belongs to. Null only if the run can no longer be read. Costs one lookup per trajectory, so select it for one trajectory rather than a list.`,
    nullable: true,
  })
  async planId(
    @Parent() trajectory: AgentTrajectoryObject,
  ): Promise<string | null> {
    const run = await this.planRunsRepository.findRunById(trajectory.planRunId);

    return run?.planId ?? null;
  }

  @Query(() => AgentTrajectoryObject, {
    description: `Fetch one recorded agent trajectory by id. Null when it does not exist.`,
    nullable: true,
  })
  async agentTrajectory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<AgentTrajectoryObject | null> {
    const row = await this.agentTrajectoriesRepository.findTrajectoryById(id);

    return row == null ? null : toAgentTrajectoryObject(row);
  }

  @Query(() => [AgentTrajectoryObject], {
    description: `List a plan run's agent trajectories, oldest first.`,
  })
  async agentTrajectoriesByPlanRun(
    @Args('planRunId', { type: () => ID }) planRunId: string,
  ): Promise<AgentTrajectoryObject[]> {
    const rows =
      await this.agentTrajectoriesRepository.findByPlanRun(planRunId);

    return rows.map(toAgentTrajectoryObject);
  }

  @Query(() => [AgentTrajectoryObject], {
    description: `List a task's agent trajectories, oldest first.`,
  })
  async agentTrajectoriesByTask(
    @Args('taskId', { type: () => ID }) taskId: string,
  ): Promise<AgentTrajectoryObject[]> {
    const rows = await this.agentTrajectoriesRepository.findByTask(taskId);

    return rows.map(toAgentTrajectoryObject);
  }

  @Query(() => AgentTrajectoryPlanGroupPageObject, {
    description: `List recorded trajectories grouped by their plan, newest activity first, with your scoring progress per plan. scoreState keeps every trajectory (ALL), only those you labelled (SCORED) or only those still waiting on your verdict (UNSCORED); a plan with none left is omitted. Trajectories of deleted plans share one group with null plan fields. Cursor-paginated by plan: first is 1 to 50 (default 20), after is the previous page's endCursor. planId narrows the listing to one plan, for a scoring view's progress and next unscored trajectory.`,
  })
  async agentTrajectoryPlanGroups(
    @Args('after', { nullable: true, type: () => String })
    after: string | null | undefined,
    @Args('first', { nullable: true, type: () => Int })
    first: number | null | undefined,
    @Args('planId', { nullable: true, type: () => ID })
    planId: string | null | undefined,
    @Args('repositoryId', { nullable: true, type: () => ID })
    repositoryId: string | null | undefined,
    @Args('scoreState', {
      defaultValue: AgentTrajectoryScoreState.ALL,
      type: () => AgentTrajectoryScoreState,
    })
    scoreState: AgentTrajectoryScoreStateValue,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<AgentTrajectoryPlanGroupPageObject> {
    const pageSize = first ?? DEFAULT_PLAN_GROUPS_PAGE_SIZE;

    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > MAX_PLAN_GROUPS_PAGE_SIZE
    ) {
      throw new BadRequestException(
        `first must be 1 to ${MAX_PLAN_GROUPS_PAGE_SIZE}`,
      );
    }

    const result = await this.agentTrajectoriesRepository.findPlanGroups({
      after: after ?? null,
      first: pageSize,
      planId: planId ?? null,
      rater: resolveLabelRater(this.globalCls.get('user'), principal),
      repositoryId: repositoryId ?? null,
      scoreState,
    });

    if (result.kind === 'invalid-cursor') {
      throw new BadRequestException(
        'after is not a cursor this listing issued',
      );
    }

    return toAgentTrajectoryPlanGroupPageObject(result.page);
  }

  @Mutation(() => AgentTrajectoryObject, {
    description: `Record an ATIF trajectory for a plan run. With an idempotencyKey a duplicate is a successful no-op that returns the stored row. The document is validated, capped at 4 MiB server-side (elided observations set truncated) and summarized into token, cost and tool-call columns.`,
  })
  async recordAgentTrajectory(
    @Args('input', { type: () => RecordAgentTrajectoryInput })
    input: RecordAgentTrajectoryInput,
  ): Promise<AgentTrajectoryObject> {
    if (!isAgentTrajectorySource(input.source)) {
      throw new BadRequestException(
        `source must be '${AGENT_TRAJECTORY_SOURCE.SPAWNED}' or '${AGENT_TRAJECTORY_SOURCE.SESSION_UPLOAD}'`,
      );
    }

    if (
      input.idempotencyKey != null &&
      (input.idempotencyKey === '' ||
        input.idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH)
    ) {
      throw new BadRequestException(
        `idempotencyKey must be 1 to ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      );
    }

    const parsed = parseAtifTrajectoryJson(input.trajectoryJson);

    if (parsed === undefined) {
      throw new BadRequestException(
        'trajectoryJson is not a valid ATIF document',
      );
    }

    const capped = capTrajectory(parsed);
    const summary = summarizeTrajectory(capped.trajectory);

    try {
      const row = await this.agentTrajectoriesRepository.createTrajectory({
        byteSize: capped.byteSize,
        cachedTokens: summary.cachedTokens,
        costUsd: summary.costUsd,
        driver: input.driver,
        durationMs: input.durationMs ?? null,
        exitCode: input.exitCode ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        incomplete: summary.incomplete,
        inputTokens: summary.inputTokens,
        model: input.model ?? null,
        outcome: input.outcome ?? null,
        outputTokens: summary.outputTokens,
        planRunId: input.planRunId,
        schemaVersion: capped.trajectory.schema_version,
        source: input.source,
        taskId: input.taskId ?? null,
        toolCallCount: summary.toolCallCount,
        trajectory: capped.trajectory,
        truncated: capped.truncated,
      });

      return toAgentTrajectoryObject(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('plan run or task not found');
      }

      throw error;
    }
  }

  @Mutation(() => AgentTrajectoryObject, {
    description: `Replace the ATIF document on an existing trajectory in place, keeping its id so human labels keyed by trajectory id survive. Used by the session re-segment operator when a task's boundaries change. The document is validated and capped the same way as recordAgentTrajectory.`,
  })
  async replaceAgentTrajectory(
    @Args('id', { type: () => ID }) id: string,
    @Args('input', { type: () => ReplaceAgentTrajectoryInput })
    input: ReplaceAgentTrajectoryInput,
  ): Promise<AgentTrajectoryObject> {
    if (
      input.idempotencyKey != null &&
      (input.idempotencyKey === '' ||
        input.idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH)
    ) {
      throw new BadRequestException(
        `idempotencyKey must be 1 to ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      );
    }

    const parsed = parseAtifTrajectoryJson(input.trajectoryJson);

    if (parsed === undefined) {
      throw new BadRequestException(
        'trajectoryJson is not a valid ATIF document',
      );
    }

    const capped = capTrajectory(parsed);
    const summary = summarizeTrajectory(capped.trajectory);

    try {
      const row = await this.agentTrajectoriesRepository.replaceTrajectory(id, {
        byteSize: capped.byteSize,
        cachedTokens: summary.cachedTokens,
        costUsd: summary.costUsd,
        durationMs: input.durationMs ?? null,
        exitCode: input.exitCode ?? null,
        idempotencyKey: input.idempotencyKey ?? null,
        incomplete: summary.incomplete,
        inputTokens: summary.inputTokens,
        model: input.model ?? null,
        outcome: input.outcome ?? null,
        outputTokens: summary.outputTokens,
        planRunId: input.planRunId,
        schemaVersion: capped.trajectory.schema_version,
        toolCallCount: summary.toolCallCount,
        trajectory: capped.trajectory,
        truncated: capped.truncated,
      });

      if (row == null) {
        throw new NotFoundException('trajectory not found');
      }

      return toAgentTrajectoryObject(row);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (isForeignKeyViolation(error)) {
        throw new NotFoundException('plan run or task not found');
      }

      throw error;
    }
  }
}
