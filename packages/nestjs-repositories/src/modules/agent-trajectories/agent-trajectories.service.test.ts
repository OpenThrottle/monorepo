import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_TRAJECTORY_SOURCE } from './agent-trajectories.constants.ts';
import { AgentTrajectoriesService } from './agent-trajectories.service.ts';
import type { CreateAgentTrajectoryInput } from './agent-trajectories.types.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';
import { agentTrajectoryFactory } from './agent-trajectory.factory.ts';

describe('AgentTrajectoriesService', () => {
  const planRunId = 'a1a2a3a4-0000-4000-8000-000000000001';
  const taskId = 'c1c2c3c4-0000-4000-8000-000000000003';

  const mockRepository = {
    create: vi.fn((data: Partial<AgentTrajectory>) =>
      agentTrajectoryFactory.build(data),
    ),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: AgentTrajectory) => Promise.resolve(entity)),
  };

  let service: AgentTrajectoriesService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentTrajectoriesService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(AgentTrajectory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = app.get<AgentTrajectoriesService>(AgentTrajectoriesService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    const {
      id: _id,
      createdAt: _createdAt,
      ...fields
    } = agentTrajectoryFactory.build({
      planRunId,
      taskId,
    });
    const input: CreateAgentTrajectoryInput = {
      ...fields,
      source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
    };

    it('builds the row from the input and saves it', async () => {
      const saved = await service.create(input);

      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(saved.planRunId).toBe(planRunId);
      expect(saved.taskId).toBe(taskId);
    });

    it('keeps an unpriceable cost as null rather than zero', async () => {
      const saved = await service.create({ ...input, costUsd: null });

      expect(saved.costUsd).toBeNull();
    });

    it('rejects when the save fails so the capture site can fail open', async () => {
      mockRepository.save.mockRejectedValueOnce(new Error('db down'));

      await expect(service.create(input)).rejects.toThrow('db down');
    });
  });

  describe('findById', () => {
    it('returns the row for an existing id', async () => {
      const row = agentTrajectoryFactory.build();
      mockRepository.findOne.mockResolvedValueOnce(row);

      await expect(service.findById(row.id)).resolves.toBe(row);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: row.id },
      });
    });

    it('returns null when nothing matches', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByPlanRun', () => {
    it('lists the run trajectories oldest first', async () => {
      const rows = [agentTrajectoryFactory.build({ planRunId })];
      mockRepository.find.mockResolvedValueOnce(rows);

      await expect(service.findByPlanRun(planRunId)).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { planRunId },
      });
    });
  });

  describe('findByTask', () => {
    it('lists the task trajectories oldest first', async () => {
      const rows = [agentTrajectoryFactory.build({ taskId })];
      mockRepository.find.mockResolvedValueOnce(rows);

      await expect(service.findByTask(taskId)).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { taskId },
      });
    });
  });

  it('exposes the repository', () => {
    expect(service.getRepository()).toBe(mockRepository);
  });
});
