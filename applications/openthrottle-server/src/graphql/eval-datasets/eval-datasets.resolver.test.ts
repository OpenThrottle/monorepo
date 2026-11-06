import { createMock } from '@golevelup/ts-vitest';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GlobalClsService } from '@openthrottle/nestjs-modules';
import {
  AgentTrajectoriesService,
  type AgentTrajectory,
  EVAL_DATASET_TARGET,
  EVAL_SPLIT,
  type EvalDataset,
  EvalDatasetsService,
} from '@openthrottle/nestjs-repositories';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { EvalDatasetsResolver } from './eval-datasets.resolver.ts';

const repositoryId = '11111111-1111-4111-8111-111111111111';
const trajectoryId = '22222222-2222-4222-8222-222222222222';

const trajectory: AgentTrajectory = {
  byteSize: 10,
  cachedTokens: null,
  costUsd: null,
  createdAt: new Date('2026-11-06T08:00:00.000Z'),
  driver: 'claude',
  durationMs: null,
  exitCode: null,
  id: trajectoryId,
  idempotencyKey: null,
  incomplete: false,
  inputTokens: null,
  model: 'claude-sonnet-5-5',
  outcome: null,
  outputTokens: null,
  planRunId: '33333333-3333-4333-8333-333333333333',
  schemaVersion: 'ATIF-v1.8',
  source: 'spawned',
  taskId: '44444444-4444-4444-8444-444444444444',
  toolCallCount: 0,
  trajectory: {
    agent: { name: 'claude', version: 'test' },
    schema_version: 'ATIF-v1.8',
    steps: [],
  },
  truncated: false,
};

const dataset: EvalDataset = {
  createdAt: new Date('2026-11-06T08:00:00.000Z'),
  createdBy: 'visormatt',
  description: null,
  id: '55555555-5555-4555-8555-555555555555',
  name: 'failures',
  repositoryId,
  target: EVAL_DATASET_TARGET.PLAN_TASK,
  updatedAt: new Date('2026-11-06T08:00:00.000Z'),
  version: 1,
};

const buildInput = (
  overrides: Partial<{
    cases: {
      goldJson: string;
      inputJson: string | null;
      split: string;
      trajectoryId: string;
    }[];
    description: string | null;
    name: string;
    target: string;
  }> = {},
) => {
  return {
    cases: [
      {
        goldJson: '{"passes":true}',
        inputJson: null,
        split: 'dev',
        trajectoryId,
      },
    ],
    description: null,
    name: 'failures',
    repositoryId,
    target: 'plan_task',
    ...overrides,
  };
};

const mockDatasets = createMock<EvalDatasetsService>({
  create: vi.fn(),
  findById: vi.fn(),
  findByRepository: vi.fn(),
  findCases: vi.fn(),
});
const mockTrajectories = createMock<AgentTrajectoriesService>({
  findById: vi.fn(),
});
const mockCls = createMock<GlobalClsService>({ get: vi.fn() });

describe('EvalDatasetsResolver', () => {
  let resolver: EvalDatasetsResolver;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(mockCls.get).mockReturnValue({
      displayName: 'visormatt',
      email: 'visormatt@example.com',
      isDeleted: false,
      roles: [],
      uuid: 'u1',
    });
    vi.mocked(mockTrajectories.findById).mockResolvedValue(trajectory);
    vi.mocked(mockDatasets.create).mockResolvedValue(dataset);

    const app = await Test.createTestingModule({
      providers: [
        EvalDatasetsResolver,
        { provide: EvalDatasetsService, useValue: mockDatasets },
        { provide: AgentTrajectoriesService, useValue: mockTrajectories },
        { provide: GlobalClsService, useValue: mockCls },
      ],
    }).compile();

    resolver = app.get(EvalDatasetsResolver);
  });

  describe('createEvalDatasetFromTrajectories', () => {
    test('stamps the creator and derives the case input from the trajectory', async () => {
      const result = await resolver.createEvalDatasetFromTrajectories(
        buildInput(),
        undefined,
      );

      expect(mockDatasets.create).toHaveBeenCalledWith({
        cases: [
          {
            gold: { passes: true },
            input: {
              driver: 'claude',
              model: 'claude-sonnet-5-5',
              planRunId: trajectory.planRunId,
              taskId: trajectory.taskId,
              trajectoryId,
            },
            sourceTrajectoryId: trajectoryId,
            split: EVAL_SPLIT.DEV,
          },
        ],
        createdBy: 'visormatt',
        description: null,
        name: 'failures',
        repositoryId,
        target: EVAL_DATASET_TARGET.PLAN_TASK,
      });
      expect(result.id).toBe(dataset.id);
    });

    test('uses the client input when given', async () => {
      await resolver.createEvalDatasetFromTrajectories(
        buildInput({
          cases: [
            {
              goldJson: '1',
              inputJson: '{"prompt":"x"}',
              split: 'test',
              trajectoryId,
            },
          ],
        }),
        undefined,
      );

      expect(mockDatasets.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cases: [
            expect.objectContaining({
              gold: 1,
              input: { prompt: 'x' },
              split: EVAL_SPLIT.TEST,
            }),
          ],
        }),
      );
    });

    test('falls back to the principal when there is no CLS user', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);

      await resolver.createEvalDatasetFromTrajectories(buildInput(), {
        email: 'alice@example.com',
        kind: 'user',
        sub: 'sub-1',
      });

      expect(mockDatasets.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 'alice@example.com' }),
      );
    });

    test('rejects an unauthenticated caller', async () => {
      vi.mocked(mockCls.get).mockReturnValue(undefined);

      await expect(
        resolver.createEvalDatasetFromTrajectories(buildInput(), undefined),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    test('rejects an unknown target', async () => {
      await expect(
        resolver.createEvalDatasetFromTrajectories(
          buildInput({ target: 'nope' }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects a blank name', async () => {
      await expect(
        resolver.createEvalDatasetFromTrajectories(
          buildInput({ name: '  ' }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects an empty case list', async () => {
      await expect(
        resolver.createEvalDatasetFromTrajectories(
          buildInput({ cases: [] }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects an unknown split', async () => {
      await expect(
        resolver.createEvalDatasetFromTrajectories(
          buildInput({
            cases: [
              { goldJson: '1', inputJson: null, split: 'val', trajectoryId },
            ],
          }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('rejects malformed gold JSON', async () => {
      await expect(
        resolver.createEvalDatasetFromTrajectories(
          buildInput({
            cases: [
              { goldJson: '{', inputJson: null, split: 'dev', trajectoryId },
            ],
          }),
          undefined,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    test('maps a missing trajectory to NotFound', async () => {
      vi.mocked(mockTrajectories.findById).mockResolvedValue(null);

      await expect(
        resolver.createEvalDatasetFromTrajectories(buildInput(), undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockDatasets.create).not.toHaveBeenCalled();
    });

    test('maps a foreign-key violation (missing repository) to NotFound', async () => {
      vi.mocked(mockDatasets.create).mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('fk'), { code: '23503' }),
        ),
      );

      await expect(
        resolver.createEvalDatasetFromTrajectories(buildInput(), undefined),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    test('rethrows any other database error', async () => {
      const boom = new Error('boom');
      vi.mocked(mockDatasets.create).mockRejectedValue(boom);

      await expect(
        resolver.createEvalDatasetFromTrajectories(buildInput(), undefined),
      ).rejects.toBe(boom);
    });
  });

  describe('queries', () => {
    test('evalDataset returns null when missing', async () => {
      vi.mocked(mockDatasets.findById).mockResolvedValue(null);

      await expect(resolver.evalDataset('x')).resolves.toBeNull();
    });

    test('evalDatasets maps a repository list', async () => {
      vi.mocked(mockDatasets.findByRepository).mockResolvedValue([dataset]);

      const result = await resolver.evalDatasets(repositoryId);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe('failures');
    });

    test('cases serializes input and gold to JSON strings', async () => {
      vi.mocked(mockDatasets.findCases).mockResolvedValue([
        {
          createdAt: dataset.createdAt,
          datasetId: dataset.id,
          gold: { passes: true },
          id: 'c1',
          input: { prompt: 'x' },
          sourceTrajectoryId: trajectoryId,
          split: EVAL_SPLIT.DEV,
        },
      ]);

      const [first] = await resolver.cases(dataset);

      expect(first?.goldJson).toBe('{"passes":true}');
      expect(first?.inputJson).toBe('{"prompt":"x"}');
    });
  });
});
