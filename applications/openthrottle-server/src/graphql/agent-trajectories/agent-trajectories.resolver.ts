/**
 * @description Resolver for agent trajectories (agent_trajectories): record one ATIF document for
 * a plan run and read them back by id, plan run or task. Recording validates the document, applies
 * the server-side size backstop and derives the summary columns; see
 * docs/openthrottle/eval-system-adr.md.
 */

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import {
  AGENT_TRAJECTORY_SOURCE,
  AgentTrajectoriesService,
  type AgentTrajectorySource,
} from '@openthrottle/nestjs-repositories';
import {
  capTrajectory,
  parseAtifTrajectoryJson,
  summarizeTrajectory,
} from '@openthrottle/openthrottle-agentic-utils';
import { QueryFailedError } from 'typeorm';

import { RecordAgentTrajectoryInput } from './agent-trajectory.input.ts';
import { toAgentTrajectoryObject } from './agent-trajectory.mapper.ts';
import { AgentTrajectoryObject } from './agent-trajectory.object.ts';

const FOREIGN_KEY_VIOLATION = '23503';

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
    private readonly agentTrajectoriesService: AgentTrajectoriesService,
  ) {}

  @Query(() => AgentTrajectoryObject, {
    description: `Fetch one recorded agent trajectory by id. Null when it does not exist.`,
    nullable: true,
  })
  async agentTrajectory(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<AgentTrajectoryObject | null> {
    const row = await this.agentTrajectoriesService.findById(id);

    return row == null ? null : toAgentTrajectoryObject(row);
  }

  @Query(() => [AgentTrajectoryObject], {
    description: `List a plan run's agent trajectories, oldest first.`,
  })
  async agentTrajectoriesByPlanRun(
    @Args('planRunId', { type: () => ID }) planRunId: string,
  ): Promise<AgentTrajectoryObject[]> {
    const rows = await this.agentTrajectoriesService.findByPlanRun(planRunId);

    return rows.map(toAgentTrajectoryObject);
  }

  @Query(() => [AgentTrajectoryObject], {
    description: `List a task's agent trajectories, oldest first.`,
  })
  async agentTrajectoriesByTask(
    @Args('taskId', { type: () => ID }) taskId: string,
  ): Promise<AgentTrajectoryObject[]> {
    const rows = await this.agentTrajectoriesService.findByTask(taskId);

    return rows.map(toAgentTrajectoryObject);
  }

  @Mutation(() => AgentTrajectoryObject, {
    description: `Record an ATIF trajectory for a plan run. The document is validated, capped at 4 MiB server-side (elided observations set truncated) and summarized into token, cost and tool-call columns.`,
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

    const parsed = parseAtifTrajectoryJson(input.trajectoryJson);

    if (parsed === undefined) {
      throw new BadRequestException(
        'trajectoryJson is not a valid ATIF document',
      );
    }

    const capped = capTrajectory(parsed);
    const summary = summarizeTrajectory(capped.trajectory);

    try {
      const row = await this.agentTrajectoriesService.create({
        byteSize: capped.byteSize,
        cachedTokens: summary.cachedTokens,
        costUsd: summary.costUsd,
        driver: input.driver,
        durationMs: input.durationMs ?? null,
        exitCode: input.exitCode ?? null,
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
}
