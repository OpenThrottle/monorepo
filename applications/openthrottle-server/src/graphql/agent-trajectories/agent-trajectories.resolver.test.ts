import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AgentTrajectory } from '@openthrottle/nestjs-repositories';
import {
  AGENT_TRAJECTORY_SOURCE,
  AgentTrajectoriesService,
} from '@openthrottle/nestjs-repositories';
import type { AtifTrajectory } from '@openthrottle/openthrottle-agentic-utils';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { AgentTrajectoriesResolver } from './agent-trajectories.resolver.ts';

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

const mockService = createMock<AgentTrajectoriesService>({
  create: vi.fn(),
  findById: vi.fn(),
  findByPlanRun: vi.fn(),
  findByTask: vi.fn(),
});

describe('AgentTrajectoriesResolver', () => {
  let resolver: AgentTrajectoriesResolver;

  beforeEach(async () => {
    vi.clearAllMocks();

    const app = await Test.createTestingModule({
      providers: [
        AgentTrajectoriesResolver,
        { provide: AgentTrajectoriesService, useValue: mockService },
      ],
    }).compile();

    resolver = app.get(AgentTrajectoriesResolver);
  });

  describe('recordAgentTrajectory', () => {
    test('stores the capped trajectory with derived summary columns', async () => {
      const row = buildRow();
      vi.mocked(mockService.create).mockResolvedValue(row);

      const result = await resolver.recordAgentTrajectory(buildInput());

      expect(mockService.create).toHaveBeenCalledWith(
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
      expect(mockService.create).not.toHaveBeenCalled();
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
      expect(mockService.create).not.toHaveBeenCalled();
    });

    test('passes the idempotency key through to the service', async () => {
      vi.mocked(mockService.create).mockResolvedValue(buildRow());

      await resolver.recordAgentTrajectory(
        buildInput({ idempotencyKey: 'session:s1:toolu_1' }),
      );

      expect(mockService.create).toHaveBeenCalledWith(
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
      expect(mockService.create).not.toHaveBeenCalled();
    });

    test('maps a foreign key violation to NotFound', async () => {
      vi.mocked(mockService.create).mockRejectedValue(
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
      vi.mocked(mockService.create).mockRejectedValue(failure);

      await expect(resolver.recordAgentTrajectory(buildInput())).rejects.toBe(
        failure,
      );
    });
  });

  describe('agentTrajectory', () => {
    test('returns the mapped trajectory', async () => {
      const row = buildRow();
      vi.mocked(mockService.findById).mockResolvedValue(row);

      const result = await resolver.agentTrajectory(row.id);

      expect(result?.id).toBe(row.id);
      expect(result?.trajectoryJson).toBe(JSON.stringify(atif));
    });

    test('returns null when missing', async () => {
      vi.mocked(mockService.findById).mockResolvedValue(null);

      expect(await resolver.agentTrajectory('missing')).toBeNull();
    });
  });

  describe('agentTrajectoriesByPlanRun', () => {
    test('lists the plan run trajectories', async () => {
      vi.mocked(mockService.findByPlanRun).mockResolvedValue([
        buildRow(),
        buildRow({ id: 'f1f2f3f4-0000-4000-8000-000000000002' }),
      ]);

      const result = await resolver.agentTrajectoriesByPlanRun(planRunId);

      expect(mockService.findByPlanRun).toHaveBeenCalledWith(planRunId);
      expect(result).toHaveLength(2);
    });
  });

  describe('agentTrajectoriesByTask', () => {
    test('lists the task trajectories', async () => {
      vi.mocked(mockService.findByTask).mockResolvedValue([
        buildRow({ taskId }),
      ]);

      const result = await resolver.agentTrajectoriesByTask(taskId);

      expect(mockService.findByTask).toHaveBeenCalledWith(taskId);
      expect(result).toHaveLength(1);
    });
  });
});
