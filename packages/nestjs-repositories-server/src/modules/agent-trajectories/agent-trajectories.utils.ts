import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import { agentTrajectoriesFactory } from './agent-trajectories.factory.ts';
import type { AgentTrajectoriesRepository } from './agent-trajectories.repository.ts';
import type { AgentTrajectoriesRepositoryMock } from './agent-trajectories.types.ts';
import type { AgentTrajectory } from './agent-trajectory.entity.ts';

/**
 * @description Builds an {@link AgentTrajectoriesRepositoryMock} that starts as an empty
 * `agent_trajectories` table (see `createBaseRepositoryMock`): lookups resolve null or an empty
 * list, a replace matches no row, and `createTrajectory` resolves a factory row carrying its
 * input. Provide it in place of `AgentTrajectoriesRepository` and stub per test. Test-only:
 * imports `vitest`.
 * @public
 */
export function createAgentTrajectoriesRepositoryMock(): AgentTrajectoriesRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      AgentTrajectory,
      CreateModelInput<AgentTrajectory>
    >('agent_trajectories'),
    createTrajectory: vi.fn<AgentTrajectoriesRepository['createTrajectory']>(
      async (input) => {
        return agentTrajectoriesFactory.build(input);
      },
    ),
    findByIdempotencyKey: vi.fn(async () => {
      return null;
    }),
    findByPlanRun: vi.fn(async () => {
      return [];
    }),
    findByTask: vi.fn(async () => {
      return [];
    }),
    findTrajectoryById: vi.fn(async () => {
      return null;
    }),
    replaceTrajectory: vi.fn(async () => {
      return null;
    }),
  };
}
