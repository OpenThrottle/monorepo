/**
 * @description Types for agent trajectories (agent_trajectories, migration 145) shared by
 * AgentTrajectoriesService and its callers.
 */

import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';

import type { AGENT_TRAJECTORY_SOURCE } from './agent-trajectories.constants.ts';

/** @public */
export type AgentTrajectorySource =
  (typeof AGENT_TRAJECTORY_SOURCE)[keyof typeof AGENT_TRAJECTORY_SOURCE];

/**
 * @description Everything a caller supplies to record a trajectory. `costUsd` is null when the run
 * is unpriceable; that is not the same as zero. `idempotencyKey` makes recording idempotent: a
 * second create with the same non-null key returns the stored row instead of inserting.
 * @public
 */
export interface CreateAgentTrajectoryInput {
  readonly byteSize: number;
  readonly cachedTokens: number | null;
  readonly costUsd: number | null;
  readonly driver: string;
  readonly durationMs: number | null;
  readonly exitCode: number | null;
  readonly idempotencyKey: string | null;
  readonly incomplete: boolean;
  readonly inputTokens: number | null;
  readonly model: string | null;
  readonly outcome: string | null;
  readonly outputTokens: number | null;
  readonly planRunId: string;
  readonly schemaVersion: string;
  readonly source: AgentTrajectorySource;
  readonly taskId: string | null;
  readonly toolCallCount: number;
  readonly trajectory: AtifTrajectory;
  readonly truncated: boolean;
}
