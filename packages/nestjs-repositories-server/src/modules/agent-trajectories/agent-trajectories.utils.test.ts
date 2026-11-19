import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { agentTrajectoriesFactory } from './agent-trajectories.factory.ts';
import { createAgentTrajectoriesRepositoryMock } from './agent-trajectories.utils.ts';

describe('createAgentTrajectoriesRepositoryMock', () => {
  it('starts with no trajectories', async () => {
    const repository = createAgentTrajectoriesRepositoryMock();
    const replacement = agentTrajectoriesFactory.build();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findByIdempotencyKey('k')).resolves.toBeNull();
    await expect(repository.findByPlanRun('p')).resolves.toEqual([]);
    await expect(repository.findByTask('t')).resolves.toEqual([]);
    await expect(repository.findTrajectoryById('a')).resolves.toBeNull();
    await expect(
      repository.replaceTrajectory('a', replacement),
    ).resolves.toBeNull();
  });

  it('records a row carrying the input', async () => {
    const repository = createAgentTrajectoriesRepositoryMock();
    const input = agentTrajectoriesFactory.build({ driver: 'codex' });

    await expect(repository.createTrajectory(input)).resolves.toMatchObject({
      driver: 'codex',
    });
  });

  it('names the agent_trajectories table in inherited not-found errors', async () => {
    const repository = createAgentTrajectoriesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'agent_trajectories record with ID "a" not found',
    );
  });
});
