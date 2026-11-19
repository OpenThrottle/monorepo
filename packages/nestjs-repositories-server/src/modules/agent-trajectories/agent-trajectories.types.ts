/**
 * @description Types for agent trajectories (agent_trajectories, migrations 145, 181) shared by
 * AgentTrajectoriesRepository and its callers.
 */

import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';
import type { Mock } from 'vitest';

import type { AGENT_TRAJECTORY_SOURCE } from './agent-trajectories.constants.ts';
import type { AgentTrajectoriesRepository } from './agent-trajectories.repository.ts';
import type { AgentTrajectory } from './agent-trajectory.entity.ts';

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

/**
 * @description Fields a caller may rewrite on an existing trajectory while keeping its id (so
 * human labels keyed by trajectory id survive a re-segment). `taskId`, `source` and `driver` stay
 * with the row; the document and its derived summary columns are replaced.
 * @public
 */
export interface ReplaceAgentTrajectoryInput {
  readonly byteSize: number;
  readonly cachedTokens: number | null;
  readonly costUsd: number | null;
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
  readonly toolCallCount: number;
  readonly trajectory: AtifTrajectory;
  readonly truncated: boolean;
}

/**
 * @description An {@link AgentTrajectoriesRepository} mock: every inherited `BaseRepository`
 * method plus the trajectory ones.
 * @public
 */
export interface AgentTrajectoriesRepositoryMock extends BaseRepositoryMock<
  AgentTrajectory,
  CreateModelInput<AgentTrajectory>
> {
  readonly createTrajectory: Mock<
    AgentTrajectoriesRepository['createTrajectory']
  >;
  readonly findByIdempotencyKey: Mock<
    AgentTrajectoriesRepository['findByIdempotencyKey']
  >;
  readonly findByPlanRun: Mock<AgentTrajectoriesRepository['findByPlanRun']>;
  readonly findByTask: Mock<AgentTrajectoriesRepository['findByTask']>;
  readonly findTrajectoryById: Mock<
    AgentTrajectoriesRepository['findTrajectoryById']
  >;
  readonly replaceTrajectory: Mock<
    AgentTrajectoriesRepository['replaceTrajectory']
  >;
}
