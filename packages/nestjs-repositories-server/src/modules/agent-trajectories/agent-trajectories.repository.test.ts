import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENT_TRAJECTORY_SOURCE } from './agent-trajectories.constants.ts';
import { agentTrajectoriesFactory } from './agent-trajectories.factory.ts';
import { AgentTrajectoriesRepository } from './agent-trajectories.repository.ts';
import type { CreateAgentTrajectoryInput } from './agent-trajectories.types.ts';
import { AgentTrajectory } from './agent-trajectory.entity.ts';

describe('AgentTrajectoriesRepository', () => {
  const planRunId = 'a1a2a3a4-0000-4000-8000-000000000001';
  const taskId = 'c1c2c3c4-0000-4000-8000-000000000003';

  const mockRepository = {
    create: vi.fn((data: Partial<AgentTrajectory>) =>
      agentTrajectoriesFactory.build(data),
    ),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: AgentTrajectory) => Promise.resolve(entity)),
    target: AgentTrajectory,
  };

  let repository: AgentTrajectoriesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentTrajectoriesRepository,
        {
          provide: getRepositoryToken(AgentTrajectory),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = app.get(AgentTrajectoriesRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTrajectory', () => {
    const {
      id: _id,
      createdAt: _createdAt,
      ...fields
    } = agentTrajectoriesFactory.build({
      planRunId,
      taskId,
    });
    const input: CreateAgentTrajectoryInput = {
      ...fields,
      source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
    };

    it('builds the row from the input and saves it', async () => {
      const saved = await repository.createTrajectory(input);

      expect(mockRepository.create).toHaveBeenCalledWith(input);
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(saved.planRunId).toBe(planRunId);
      expect(saved.taskId).toBe(taskId);
    });

    it('keeps an unpriceable cost as null rather than zero', async () => {
      const saved = await repository.createTrajectory({
        ...input,
        costUsd: null,
      });

      expect(saved.costUsd).toBeNull();
    });

    it('rejects when the save fails so the capture site can fail open', async () => {
      mockRepository.save.mockRejectedValueOnce(new Error('db down'));

      await expect(repository.createTrajectory(input)).rejects.toThrow(
        'db down',
      );
    });
  });

  describe('createTrajectory with an idempotencyKey', () => {
    const key = `session:s1:toolu_1`;
    const {
      createdAt: _c,
      id: _i,
      ...fields
    } = agentTrajectoriesFactory.build();
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

      const saved = await repository.createTrajectory(input);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: key },
      });
      expect(mockRepository.save).toHaveBeenCalledTimes(1);
      expect(saved.idempotencyKey).toBe(key);
    });

    it('returns the stored row without inserting for a duplicate key', async () => {
      const stored = agentTrajectoriesFactory.build({ idempotencyKey: key });
      mockRepository.findOne.mockResolvedValueOnce(stored);

      await expect(repository.createTrajectory(input)).resolves.toBe(stored);
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('returns the winner when a concurrent insert wins the race', async () => {
      const winner = agentTrajectoriesFactory.build({ idempotencyKey: key });
      mockRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);
      mockRepository.save.mockRejectedValueOnce(
        uniqueViolation('uq_agent_trajectories_idempotency_key'),
      );

      await expect(repository.createTrajectory(input)).resolves.toBe(winner);
    });

    it('rethrows a unique violation on some other constraint', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.save.mockRejectedValueOnce(uniqueViolation('other_key'));

      await expect(repository.createTrajectory(input)).rejects.toBeInstanceOf(
        QueryFailedError,
      );
    });

    it('does not look up a key when none is supplied', async () => {
      await repository.createTrajectory({ ...input, idempotencyKey: null });

      expect(mockRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findTrajectoryById', () => {
    it('returns the row for an existing id', async () => {
      const row = agentTrajectoriesFactory.build();
      mockRepository.findOne.mockResolvedValueOnce(row);

      await expect(repository.findTrajectoryById(row.id)).resolves.toBe(row);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: row.id },
      });
    });

    it('returns null when nothing matches', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        repository.findTrajectoryById('missing'),
      ).resolves.toBeNull();
    });
  });

  describe('replaceTrajectory', () => {
    it('rewrites the document on the existing row and keeps its id', async () => {
      const existing = agentTrajectoriesFactory.build({
        idempotencyKey: null,
        planRunId,
        taskId,
        toolCallCount: 1,
      });
      mockRepository.findOne.mockResolvedValueOnce(existing);

      const replaced = await repository.replaceTrajectory(existing.id, {
        byteSize: 512,
        cachedTokens: 10,
        costUsd: null,
        durationMs: 99,
        exitCode: 0,
        idempotencyKey: 'session:s1:toolu_1',
        incomplete: false,
        inputTokens: 20,
        model: 'claude-opus-5-5',
        outcome: 'completed',
        outputTokens: 5,
        planRunId,
        schemaVersion: 'ATIF-v1.8',
        toolCallCount: 3,
        trajectory: existing.trajectory,
        truncated: false,
      });

      expect(replaced?.id).toBe(existing.id);
      expect(replaced?.toolCallCount).toBe(3);
      expect(replaced?.idempotencyKey).toBe('session:s1:toolu_1');
      expect(mockRepository.save).toHaveBeenCalledWith(existing);
    });

    it('returns null when the id is unknown', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        repository.replaceTrajectory('missing', {
          byteSize: 1,
          cachedTokens: null,
          costUsd: null,
          durationMs: null,
          exitCode: null,
          idempotencyKey: null,
          incomplete: false,
          inputTokens: null,
          model: null,
          outcome: null,
          outputTokens: null,
          planRunId,
          schemaVersion: 'ATIF-v1.8',
          toolCallCount: 0,
          trajectory: agentTrajectoriesFactory.build().trajectory,
          truncated: false,
        }),
      ).resolves.toBeNull();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findByPlanRun', () => {
    it('lists the run trajectories oldest first', async () => {
      const rows = [agentTrajectoriesFactory.build({ planRunId })];
      mockRepository.find.mockResolvedValueOnce(rows);

      await expect(repository.findByPlanRun(planRunId)).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { planRunId },
      });
    });
  });

  describe('findByTask', () => {
    it('lists the task trajectories oldest first', async () => {
      const rows = [agentTrajectoriesFactory.build({ taskId })];
      mockRepository.find.mockResolvedValueOnce(rows);

      await expect(repository.findByTask(taskId)).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        where: { taskId },
      });
    });
  });
});
