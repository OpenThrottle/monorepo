import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { QueryFailedError } from 'typeorm';
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

  describe('create with an idempotencyKey', () => {
    const key = `session:s1:toolu_1`;
    const { createdAt: _c, id: _i, ...fields } = agentTrajectoryFactory.build();
    const input: CreateAgentTrajectoryInput = {
      ...fields,
      idempotencyKey: key,
    };

    const uniqueViolation = (constraint: string): QueryFailedError => {
      return new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('duplicate key'), {
          code: '23505',
          constraint,
        }),
      );
    };

    it('inserts when the key is new', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      const saved = await service.create(input);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: key },
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(saved.idempotencyKey).toBe(key);
    });

    it('returns the stored row without inserting for a duplicate key', async () => {
      const stored = agentTrajectoryFactory.build({ idempotencyKey: key });
      mockRepository.findOne.mockResolvedValueOnce(stored);

      await expect(service.create(input)).resolves.toBe(stored);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns the winner when a concurrent insert wins the race', async () => {
      const winner = agentTrajectoryFactory.build({ idempotencyKey: key });
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);
      mockRepository.save.mockRejectedValueOnce(
        uniqueViolation('uq_agent_trajectories_idempotency_key'),
      );

      await expect(service.create(input)).resolves.toBe(winner);
    });

    it('rethrows a unique violation on some other constraint', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.save.mockRejectedValueOnce(uniqueViolation('other_key'));

      await expect(service.create(input)).rejects.toBeInstanceOf(
        QueryFailedError,
      );
    });

    it('does not look up a key when none is supplied', async () => {
      await service.create({ ...input, idempotencyKey: null });

      expect(mockRepository.findOne).not.toHaveBeenCalled();
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
