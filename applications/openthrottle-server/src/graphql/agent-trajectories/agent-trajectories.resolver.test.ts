import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import type {
  AgentTrajectory,
  PlanRun,
} from '@openthrottle/nestjs-repositories-server';
import {
  AGENT_TRAJECTORY_SCORE_STATE,
  AGENT_TRAJECTORY_SOURCE,
  AgentTrajectoriesRepository,
  PlanRunsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createAgentTrajectoriesRepositoryMock,
  createPlanRunsRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AgentTrajectoriesResolver } from './agent-trajectories.resolver.ts';
import { toAgentTrajectoryObject } from './agent-trajectory.mapper.ts';

const planRunId = '9a1c2b3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d';
const taskId = '2f1e7d4c-1b43-4a4c-9e3a-6bb1f3b4c001';

const atif: AtifTrajectory = {
  agent: { name: 'claude', version: '2.0.0' },
  final_metrics: {
    total_cached_tokens: 40,
    total_completion_tokens: 20,
    total_prompt_tokens: 100,
    total_steps: 2,
  },
  schema_version: 'ATIF-v1.8',
  steps: [
    { message: 'Fix the bug', source: 'user', step_id: 1 },
    {
      message: 'Reading the file',
      observation: {
        results: [{ content: 'file contents', source_call_id: 'call-1' }],
      },
      source: 'agent',
      step_id: 2,
      tool_calls: [
        {
          arguments: { path: 'a.ts' },
          function_name: 'Read',
          tool_call_id: 'call-1',
        },
      ],
    },
  ],
};

const buildRow = (
  overrides: Partial<AgentTrajectory> = {},
): AgentTrajectory => {
  return {
    byteSize: 256,
    cachedTokens: 40,
    costUsd: null,
    createdAt: new Date('2026-11-05T08:00:00.000Z'),
    driver: 'claude',
    durationMs: 1200,
    exitCode: 0,
    id: 'f1f2f3f4-0000-4000-8000-000000000001',
    idempotencyKey: null,
    incomplete: false,
    inputTokens: 100,
    model: 'claude-sonnet-5-5',
    outcome: 'completed',
    outputTokens: 20,
    planRunId,
    schemaVersion: 'ATIF-v1.8',
    source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
    taskId: null,
    toolCallCount: 1,
    trajectory: atif,
    truncated: false,
    ...overrides,
  };
};

const buildInput = (
  overrides: Partial<{
    idempotencyKey: string | null;
    source: string;
    trajectoryJson: string;
  }> = {},
) => {
  return {
    driver: 'claude',
    durationMs: 1200,
    exitCode: 0,
    idempotencyKey: null,
    model: 'claude-sonnet-5-5',
    outcome: 'completed',
    planRunId,
    source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
    taskId,
    trajectoryJson: JSON.stringify(atif),
    ...overrides,
  };
};

const mockRepository = createAgentTrajectoriesRepositoryMock();

const mockPlanRuns = createPlanRunsRepositoryMock();

const mockCls = createMock<GlobalClsService>({ get: vi.fn() });

describe('AgentTrajectoriesResolver', () => {
  let resolver: AgentTrajectoriesResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockCls.get).mockReturnValue({
      displayName: 'visormatt',
      email: 'visormatt@example.com',
      isDeleted: false,
      roles: [],
      uuid: 'u1',
    });

    const app = await Test.createTestingModule({
      providers: [
        AgentTrajectoriesResolver,
        { provide: AgentTrajectoriesRepository, useValue: mockRepository },
        { provide: GlobalClsService, useValue: mockCls },
        { provide: PlanRunsRepository, useValue: mockPlanRuns },
      ],
    }).compile();

    resolver = app.get(AgentTrajectoriesResolver);
  });

  describe('planId', () => {
    test("resolves the plan of the trajectory's plan run", async () => {
      vi.mocked(mockPlanRuns.findRunById).mockResolvedValue(
        createMock<PlanRun>({ planId: 'plan-1' }),
      );

      await expect(
        resolver.planId(toAgentTrajectoryObject(buildRow())),
      ).resolves.toBe('plan-1');
      expect(mockPlanRuns.findRunById).toHaveBeenCalledWith(planRunId);
    });

    test('is null when the run cannot be read', async () => {
      vi.mocked(mockPlanRuns.findRunById).mockResolvedValue(null);

      await expect(
        resolver.planId(toAgentTrajectoryObject(buildRow())),
      ).resolves.toBeNull();
    });
  });

  describe('agentTrajectoryPlanGroups', () => {
    const recordedAt = new Date('2026-11-20T10:00:00.000Z');
    const page = {
      endCursor: 'cursor-1',
      groups: [
        {
          failCount: 0,
          labelledCount: 1,
          latestRecordedAt: recordedAt,
          passCount: 1,
          planId: 'e1e2e3e4-0000-4000-8000-000000000005',
          planStatus: 'COMPLETED',
          planTitle: 'Alpha',
          scoredCount: 1,
          trajectories: [
            {
              cachedTokens: null,
              costUsd: null,
              durationMs: 9000,
              id: 'f1f2f3f4-0000-4000-8000-000000000010',
              inputTokens: 3000,
              outputTokens: 200,
              planRunId,
              recordedAt,
              source: AGENT_TRAJECTORY_SOURCE.SESSION_UPLOAD,
              taskId: null,
              taskTitle: null,
              truncated: false,
              verdict: null,
            },
          ],
          trajectoryCount: 2,
        },
      ],
      hasNextPage: true,
    };

    test('lists the caller-scoped groups with the default page size', async () => {
      vi.mocked(mockRepository.findPlanGroups).mockResolvedValue({
        kind: 'page',
        page,
      });

      const result = await resolver.agentTrajectoryPlanGroups(
        undefined,
        undefined,
        undefined,
        undefined,
        AGENT_TRAJECTORY_SCORE_STATE.UNSCORED,
        undefined,
      );

      expect(mockRepository.findPlanGroups).toHaveBeenCalledWith({
        after: null,
        first: 20,
        planId: null,
        rater: 'visormatt',
        repositoryId: null,
        scoreState: AGENT_TRAJECTORY_SCORE_STATE.UNSCORED,
      });
      expect(result).toEqual(page);
    });

    test('passes the cursor, page size and repository through', async () => {
      await resolver.agentTrajectoryPlanGroups(
        'cursor-1',
        5,
        'plan-1',
        'repo-1',
        AGENT_TRAJECTORY_SCORE_STATE.SCORED,
        undefined,
      );

      expect(mockRepository.findPlanGroups).toHaveBeenCalledWith(
        expect.objectContaining({
          after: 'cursor-1',
          first: 5,
          planId: 'plan-1',
          repositoryId: 'repo-1',
          scoreState: AGENT_TRAJECTORY_SCORE_STATE.SCORED,
        }),
      );
    });

    test('reads as nobody when the request carries no identity', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);

      await resolver.agentTrajectoryPlanGroups(
        undefined,
        undefined,
        undefined,
        undefined,
        AGENT_TRAJECTORY_SCORE_STATE.ALL,
        undefined,
      );

      expect(mockRepository.findPlanGroups).toHaveBeenCalledWith(
        expect.objectContaining({ rater: null }),
      );
    });

    test.each([0, 51, 1.5])('rejects a page size of %s', async (first) => {
      await expect(
        resolver.agentTrajectoryPlanGroups(
          undefined,
          first,
          undefined,
          undefined,
          AGENT_TRAJECTORY_SCORE_STATE.ALL,
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.findPlanGroups).not.toHaveBeenCalled();
    });

    test('rejects a cursor the listing did not issue', async () => {
      vi.mocked(mockRepository.findPlanGroups).mockResolvedValue({
        kind: 'invalid-cursor',
      });

      await expect(
        resolver.agentTrajectoryPlanGroups(
          'bogus',
          undefined,
          undefined,
          undefined,
          AGENT_TRAJECTORY_SCORE_STATE.ALL,
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('recordAgentTrajectory', () => {
    test('stores the capped trajectory with derived summary columns', async () => {
      const row = buildRow();
      vi.mocked(mockRepository.createTrajectory).mockResolvedValue(row);

      const result = await resolver.recordAgentTrajectory(buildInput());

      expect(mockRepository.createTrajectory).toHaveBeenCalledWith(
        expect.objectContaining({
          cachedTokens: 40,
          driver: 'claude',
          durationMs: 1200,
          exitCode: 0,
          incomplete: false,
          inputTokens: 100,
          model: 'claude-sonnet-5-5',
          outcome: 'completed',
          outputTokens: 20,
          planRunId,
          schemaVersion: 'ATIF-v1.8',
          source: AGENT_TRAJECTORY_SOURCE.SPAWNED,
          taskId,
          toolCallCount: 1,
          trajectory: atif,
          truncated: false,
        }),
      );
      expect(result.trajectoryJson).toBe(JSON.stringify(atif));
    });

    test('rejects a document that is not valid ATIF', async () => {
      await expect(
        resolver.recordAgentTrajectory(
          buildInput({ trajectoryJson: '{"x":1}' }),
        ),
      ).rejects.toThrow(
        new BadRequestException('trajectoryJson is not a valid ATIF document'),
      );
      expect(mockRepository.createTrajectory).not.toHaveBeenCalled();
    });

    test('rejects malformed JSON', async () => {
      await expect(
        resolver.recordAgentTrajectory(buildInput({ trajectoryJson: 'nope' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects an unknown source', async () => {
      await expect(
        resolver.recordAgentTrajectory(buildInput({ source: 'manual' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.createTrajectory).not.toHaveBeenCalled();
    });

    test('passes the idempotency key through to the service', async () => {
      vi.mocked(mockRepository.createTrajectory).mockResolvedValue(buildRow());

      await resolver.recordAgentTrajectory(
        buildInput({ idempotencyKey: 'session:s1:toolu_1' }),
      );

      expect(mockRepository.createTrajectory).toHaveBeenCalledWith(
        expect.objectContaining({ idempotencyKey: 'session:s1:toolu_1' }),
      );
    });

    test('rejects an empty or over-long idempotency key', async () => {
      await expect(
        resolver.recordAgentTrajectory(buildInput({ idempotencyKey: '' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        resolver.recordAgentTrajectory(
          buildInput({ idempotencyKey: 'k'.repeat(201) }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockRepository.createTrajectory).not.toHaveBeenCalled();
    });

    test('maps a foreign key violation to NotFound', async () => {
      vi.mocked(mockRepository.createTrajectory).mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('fk'), { code: '23503' }),
        ),
      );

      await expect(
        resolver.recordAgentTrajectory(buildInput()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('lets other database errors propagate', async () => {
      const failure = new QueryFailedError(
        'INSERT',
        [],
        Object.assign(new Error('serialization'), { code: '40001' }),
      );
      vi.mocked(mockRepository.createTrajectory).mockRejectedValue(failure);

      await expect(resolver.recordAgentTrajectory(buildInput())).rejects.toBe(
        failure,
      );
    });
  });

  describe('replaceAgentTrajectory', () => {
    const replaceInput = {
      durationMs: 900,
      exitCode: 0,
      idempotencyKey: 'session:s1:toolu_1',
      model: 'claude-opus-5-5',
      outcome: 'completed',
      planRunId,
      trajectoryJson: JSON.stringify(atif),
    };

    test('rewrites the document in place and keeps the id', async () => {
      const row = buildRow({ id: 'keep-me' });
      vi.mocked(mockRepository.replaceTrajectory).mockResolvedValue(row);

      const result = await resolver.replaceAgentTrajectory(
        'keep-me',
        replaceInput,
      );

      expect(mockRepository.replaceTrajectory).toHaveBeenCalledWith(
        'keep-me',
        expect.objectContaining({
          idempotencyKey: 'session:s1:toolu_1',
          planRunId,
          toolCallCount: 1,
          trajectory: atif,
        }),
      );
      expect(result.id).toBe('keep-me');
    });

    test('rejects a document that is not valid ATIF', async () => {
      await expect(
        resolver.replaceAgentTrajectory('keep-me', {
          ...replaceInput,
          trajectoryJson: '{"x":1}',
        }),
      ).rejects.toThrow(
        new BadRequestException('trajectoryJson is not a valid ATIF document'),
      );
      expect(mockRepository.replaceTrajectory).not.toHaveBeenCalled();
    });

    test('maps a missing row to NotFound', async () => {
      vi.mocked(mockRepository.replaceTrajectory).mockResolvedValue(null);

      await expect(
        resolver.replaceAgentTrajectory('missing', replaceInput),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('agentTrajectory', () => {
    test('returns the mapped trajectory', async () => {
      const row = buildRow();
      vi.mocked(mockRepository.findTrajectoryById).mockResolvedValue(row);

      const result = await resolver.agentTrajectory(row.id);

      expect(result?.id).toBe(row.id);
      expect(result?.trajectoryJson).toBe(JSON.stringify(atif));
    });

    test('returns null when missing', async () => {
      vi.mocked(mockRepository.findTrajectoryById).mockResolvedValue(null);

      expect(await resolver.agentTrajectory('missing')).toBeNull();
    });
  });

  describe('agentTrajectoriesByPlanRun', () => {
    test('lists the plan run trajectories', async () => {
      vi.mocked(mockRepository.findByPlanRun).mockResolvedValue([
        buildRow(),
        buildRow({ id: 'f1f2f3f4-0000-4000-8000-000000000002' }),
      ]);

      const result = await resolver.agentTrajectoriesByPlanRun(planRunId);

      expect(mockRepository.findByPlanRun).toHaveBeenCalledWith(planRunId);
      expect(result).toHaveLength(2);
    });
  });

  describe('agentTrajectoriesByTask', () => {
    test('lists the task trajectories', async () => {
      vi.mocked(mockRepository.findByTask).mockResolvedValue([
        buildRow({ taskId }),
      ]);

      const result = await resolver.agentTrajectoriesByTask(taskId);

      expect(mockRepository.findByTask).toHaveBeenCalledWith(taskId);
      expect(result).toHaveLength(1);
    });
  });
});
