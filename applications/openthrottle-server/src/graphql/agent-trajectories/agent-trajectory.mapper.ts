/**
 * @description Maps the AgentTrajectory entity to the GraphQL AgentTrajectoryObject, serializing
 * the stored ATIF document into `trajectoryJson`.
 */

import type { AgentTrajectory } from '@openthrottle/nestjs-repositories';

import type { AgentTrajectoryObject } from './agent-trajectory.object.ts';

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
