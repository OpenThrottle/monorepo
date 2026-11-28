import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AGENT_TRAJECTORY_SCORE_STATE,
  AGENT_TRAJECTORY_SOURCE,
} from './agent-trajectories.constants.ts';
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
    query: vi.fn(),
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

  describe('findPlanGroups', () => {
    const planId = 'e1e2e3e4-0000-4000-8000-000000000005';
    const unknownGroupKey = '00000000-0000-0000-0000-000000000000';
    const recordedAt = new Date('2026-11-20T10:00:00.000Z');

    const groupRow = (overrides: Record<string, unknown> = {}) => {
      return {
        fail_count: 0,
        group_key: planId,
        labelled_count: 2,
        latest_cursor: '2026-11-20 10:00:00.123456+00',
        latest_recorded_at: recordedAt,
        pass_count: 1,
        plan_id: planId,
        plan_status: 'COMPLETED',
        plan_title: 'Alpha',
        scored_count: 1,
        trajectory_count: 3,
        ...overrides,
      };
    };

    const itemRow = (overrides: Record<string, unknown> = {}) => {
      return {
        cached_tokens: 0,
        cost_usd: '0.412300',
        created_at: recordedAt,
        duration_ms: 61_000,
        group_key: planId,
        id: 'f1f2f3f4-0000-4000-8000-000000000010',
        input_tokens: 12_000,
        output_tokens: 800,
        plan_run_id: planRunId,
        source: 'spawned',
        task_id: taskId,
        task_title: 'Alpha task one',
        truncated: false,
        verdict: 'pass',
        ...overrides,
      };
    };

    const baseParams = {
      after: null,
      first: 10,
      planId: null,
      rater: 'visormatt',
      repositoryId: null,
      scoreState: AGENT_TRAJECTORY_SCORE_STATE.ALL,
    };

    const sqlOfCall = (index: number): string => {
      const call: unknown[] | undefined =
        mockRepository.query.mock.calls[index];
      const sql: unknown = call?.[0];

      return typeof sql === 'string' ? sql : '';
    };

    describe('with the ALL score state', () => {
      it('aggregates the groups, then reads their trajectories in one more query', async () => {
        mockRepository.query
          .mockResolvedValueOnce([groupRow()])
          .mockResolvedValueOnce([itemRow()]);

        const result = await repository.findPlanGroups(baseParams);

        expect(mockRepository.query).toHaveBeenCalledTimes(2);
        expect(mockRepository.query.mock.calls[0]?.[1]).toEqual([
          'visormatt',
          null,
          null,
          null,
          null,
          11,
        ]);
        expect(mockRepository.query.mock.calls[1]?.[1]).toEqual([
          'visormatt',
          null,
          null,
          [planId],
        ]);
        expect(sqlOfCall(0)).toContain('FILTER (WHERE TRUE)');
        expect(result).toEqual({
          kind: 'page',
          page: {
            endCursor: expect.any(String),
            groups: [
              {
                failCount: 0,
                labelledCount: 2,
                latestRecordedAt: recordedAt,
                passCount: 1,
                planId,
                planStatus: 'COMPLETED',
                planTitle: 'Alpha',
                scoredCount: 1,
                trajectories: [
                  {
                    cachedTokens: 0,
                    costUsd: 0.4123,
                    durationMs: 61_000,
                    id: 'f1f2f3f4-0000-4000-8000-000000000010',
                    inputTokens: 12_000,
                    outputTokens: 800,
                    planRunId,
                    recordedAt,
                    source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
                    taskId,
                    taskTitle: 'Alpha task one',
                    truncated: false,
                    verdict: 'pass',
                  },
                ],
                trajectoryCount: 3,
              },
            ],
            hasNextPage: false,
          },
        });
      });

      it('maps a plan-scoped trajectory with no task and no verdict', async () => {
        mockRepository.query
          .mockResolvedValueOnce([groupRow()])
          .mockResolvedValueOnce([
            itemRow({
              cost_usd: null,
              source: 'session_upload',
              task_id: null,
              task_title: null,
              verdict: null,
            }),
          ]);

        const result = await repository.findPlanGroups(baseParams);
        const isPage = result.kind === 'page';
        const item = isPage
          ? result.page.groups[0]?.trajectories[0]
          : undefined;

        expect(item).toMatchObject({
          costUsd: null,
          source: AGENT_TRAJECTORY_SOURCE.SESSION_UPLOAD,
          taskId: null,
          taskTitle: null,
          verdict: null,
        });
      });

      it('keeps the deleted-plan group with null plan fields', async () => {
        mockRepository.query
          .mockResolvedValueOnce([
            groupRow({
              group_key: unknownGroupKey,
              plan_id: null,
              plan_status: null,
              plan_title: null,
            }),
          ])
          .mockResolvedValueOnce([itemRow({ group_key: unknownGroupKey })]);

        const result = await repository.findPlanGroups(baseParams);
        const group =
          result.kind === 'page' ? result.page.groups[0] : undefined;

        expect(group).toMatchObject({
          planId: null,
          planStatus: null,
          planTitle: null,
        });
        expect(group?.trajectories).toHaveLength(1);
      });
    });

    describe('with the SCORED score state', () => {
      it('keeps only trajectories the caller labelled', async () => {
        mockRepository.query.mockResolvedValueOnce([]);

        await repository.findPlanGroups({
          ...baseParams,
          scoreState: AGENT_TRAJECTORY_SCORE_STATE.SCORED,
        });

        expect(sqlOfCall(0)).toContain(
          'FILTER (WHERE scoped.verdict IS NOT NULL)',
        );
      });
    });

    describe('with the UNSCORED score state', () => {
      it('keeps only trajectories the caller has not labelled, in both queries', async () => {
        mockRepository.query
          .mockResolvedValueOnce([groupRow()])
          .mockResolvedValueOnce([]);

        await repository.findPlanGroups({
          ...baseParams,
          scoreState: AGENT_TRAJECTORY_SCORE_STATE.UNSCORED,
        });

        expect(sqlOfCall(0)).toContain('FILTER (WHERE scoped.verdict IS NULL)');
        expect(sqlOfCall(1)).toContain('AND scoped.verdict IS NULL');
      });
    });

    describe('when no group matches', () => {
      it('returns an empty page without reading trajectories', async () => {
        mockRepository.query.mockResolvedValueOnce([]);

        await expect(repository.findPlanGroups(baseParams)).resolves.toEqual({
          kind: 'page',
          page: { endCursor: null, groups: [], hasNextPage: false },
        });
        expect(mockRepository.query).toHaveBeenCalledTimes(1);
      });
    });

    describe('pagination', () => {
      it('fetches one extra group to tell whether another page follows', async () => {
        const second = 'e1e2e3e4-0000-4000-8000-000000000006';
        mockRepository.query
          .mockResolvedValueOnce([groupRow(), groupRow({ group_key: second })])
          .mockResolvedValueOnce([]);

        const result = await repository.findPlanGroups({
          ...baseParams,
          first: 1,
        });

        expect(result.kind === 'page' && result.page.hasNextPage).toBe(true);
        expect(result.kind === 'page' && result.page.groups).toHaveLength(1);
        expect(mockRepository.query.mock.calls[1]?.[1]).toEqual([
          'visormatt',
          null,
          null,
          [planId],
        ]);
      });

      it('resumes after the last group of the previous page', async () => {
        mockRepository.query
          .mockResolvedValueOnce([groupRow()])
          .mockResolvedValueOnce([]);

        const first = await repository.findPlanGroups(baseParams);
        const endCursor = first.kind === 'page' ? first.page.endCursor : null;

        mockRepository.query.mockResolvedValueOnce([]);
        await repository.findPlanGroups({ ...baseParams, after: endCursor });

        expect(mockRepository.query.mock.calls[2]?.[1]).toEqual([
          'visormatt',
          null,
          null,
          '2026-11-20 10:00:00.123456+00',
          planId,
          11,
        ]);
      });

      it('narrows to one repository when asked', async () => {
        mockRepository.query.mockResolvedValueOnce([]);

        await repository.findPlanGroups({
          ...baseParams,
          repositoryId: planRunId,
        });

        expect(mockRepository.query.mock.calls[0]?.[1]?.[1]).toBe(planRunId);
      });

      it('narrows to one plan when asked', async () => {
        mockRepository.query.mockResolvedValueOnce([]);

        await repository.findPlanGroups({ ...baseParams, planId });

        expect(mockRepository.query.mock.calls[0]?.[1]?.[2]).toBe(planId);
        expect(sqlOfCall(0)).toContain('p.id = $3::uuid');
      });

      it.each(['not-a-cursor', Buffer.from('["x","y"]').toString('base64url')])(
        'refuses a cursor it did not issue (%s)',
        async (after) => {
          await expect(
            repository.findPlanGroups({ ...baseParams, after }),
          ).resolves.toEqual({ kind: 'invalid-cursor' });
          expect(mockRepository.query).not.toHaveBeenCalled();
        },
      );
    });
  });
});
