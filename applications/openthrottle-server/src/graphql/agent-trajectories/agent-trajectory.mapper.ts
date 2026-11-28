/**
 * @description Maps the AgentTrajectory entity to the GraphQL AgentTrajectoryObject, serializing
 * the stored ATIF document into `trajectoryJson`, and a plan-group page to its ObjectTypes.
 */

import type {
  AgentTrajectory,
  AgentTrajectoryPlanGroupPage,
} from '@openthrottle/nestjs-repositories-server';

import type { AgentTrajectoryObject } from './agent-trajectory.object.ts';
import type { AgentTrajectoryPlanGroupPageObject } from './agent-trajectory-plan-group.object.ts';

export const toAgentTrajectoryObject = (
  row: AgentTrajectory,
): AgentTrajectoryObject => {
  return {
    byteSize: row.byteSize,
    cachedTokens: row.cachedTokens,
    costUsd: row.costUsd,
    createdAt: row.createdAt,
    driver: row.driver,
    durationMs: row.durationMs,
    exitCode: row.exitCode,
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    incomplete: row.incomplete,
    inputTokens: row.inputTokens,
    model: row.model,
    outcome: row.outcome,
    outputTokens: row.outputTokens,
    planRunId: row.planRunId,
    schemaVersion: row.schemaVersion,
    source: row.source,
    taskId: row.taskId,
    toolCallCount: row.toolCallCount,
    trajectoryJson: JSON.stringify(row.trajectory),
    truncated: row.truncated,
  };
};

export const toAgentTrajectoryPlanGroupPageObject = (
  page: AgentTrajectoryPlanGroupPage,
): AgentTrajectoryPlanGroupPageObject => {
  return {
    endCursor: page.endCursor,
    groups: page.groups.map((group) => {
      return {
        ...group,
        trajectories: group.trajectories.map((item) => {
          return { ...item };
        }),
      };
    }),
    hasNextPage: page.hasNextPage,
  };
};
