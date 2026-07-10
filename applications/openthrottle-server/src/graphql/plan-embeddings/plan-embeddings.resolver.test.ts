import type { Plan, PlanEmbedding } from '@openthrottle/nestjs-repositories';
import {
  PlanEmbeddingsService,
  getDefaultPlanRunConfigStorage,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { PlanEmbeddingsLoaders } from './plan-embeddings-loaders';
import { PlanEmbeddingsResolver } from './plan-embeddings.resolver';

const planEmbeddingsRepo = { find: vi.fn(), findOne: vi.fn() };

const mockPlanEmbeddingsService = createMock<PlanEmbeddingsService>({
  getRepository: vi.fn().mockReturnValue(planEmbeddingsRepo),
});
const mockPlanLoad = vi.fn().mockResolvedValue(null);
const mockLoaders: PlanEmbeddingsLoaders = createMock<PlanEmbeddingsLoaders>({
  planLoader: { load: mockPlanLoad },
});

describe('PlanEmbeddingsResolver', () => {
  let resolver: PlanEmbeddingsResolver;

  const mockPlan: Plan = {
    assignee: null,
    author: 'Plan author',
    category: 'Plan category',
    commitLinks: [],
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    description: 'Plan description',
    id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    jobRunHooks: { hooks: [] },
    planEmbeddings: [],
    planOutputChunks: [],
    project: null,
    projectId: null,
    projectRelation: null,
    runConfig: getDefaultPlanRunConfigStorage(),
    status: 'IN_PROGRESS',
    summary: null,
    tasks: [],
    title: 'Plan title',
    updatedAt: new Date('2026-02-01T22:00:00.000Z'),
  };

  const mockPlanEmbedding: PlanEmbedding = {
    content: 'Plan content chunk for embedding',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    embedding: null,
    id: 'd201e2d3-111b-431e-abd6-45b6c7fda643',
    metadata: { source: 'plan' },
    plan: {
      assignee: 'Plan assignee',
      author: 'Plan author',
      category: 'Plan category',
      commitLinks: [],
      createdAt: new Date('2026-02-01T22:00:00.000Z'),
      description: 'Plan description',
      id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      jobRunHooks: { hooks: [] },
      planEmbeddings: [],
      planOutputChunks: [],
      project: 'Plan project',
      projectId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      projectRelation: {
        createdAt: new Date('2026-02-01T22:00:00.000Z'),
        description: 'Plan project description',
        id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
        name: 'Plan project name',
        nxProjectName: 'Plan project nx project name',
        plans: [],
        tasks: [],
        updatedAt: new Date('2026-02-01T22:00:00.000Z'),
      },
      runConfig: getDefaultPlanRunConfigStorage(),
      status: 'IN_PROGRESS',
      summary: 'Plan summary',
      tasks: [],
      title: 'Plan title',
      updatedAt: new Date('2026-02-01T22:00:00.000Z'),
    },
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanEmbeddingsResolver,
        {
          provide: PlanEmbeddingsService,
          useValue: mockPlanEmbeddingsService,
        },
        { provide: PlanEmbeddingsLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<PlanEmbeddingsResolver>(PlanEmbeddingsResolver);
  });

  describe('planEmbedding', () => {
    test('returns PlanEmbeddingObject when embedding exists', async () => {
      vi.mocked(planEmbeddingsRepo.findOne).mockResolvedValue(
        mockPlanEmbedding,
      );

      const result = await resolver.planEmbedding({
        id: mockPlanEmbedding.id,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlanEmbedding.id);
      expect(result?.planId).toBe(mockPlanEmbedding.planId);
      expect(result?.content).toBe(mockPlanEmbedding.content);
      expect(result?.metadata).toEqual(mockPlanEmbedding.metadata ?? {});
      expect(result?.createdAt).toEqual(mockPlanEmbedding.createdAt);
    });

    test('returns null when embedding does not exist', async () => {
      vi.mocked(planEmbeddingsRepo.findOne).mockResolvedValue(null);

      const result = await resolver.planEmbedding({
        id: 'non-existent-id',
      });

      expect(result).toBeNull();
    });
  });

  describe('planEmbeddings', () => {
    test('returns array of PlanEmbeddingObjects for planId', async () => {
      vi.mocked(planEmbeddingsRepo.find).mockResolvedValue([mockPlanEmbedding]);

      const result = await resolver.planEmbeddings({
        planId: mockPlanEmbedding.planId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockPlanEmbedding.id);
      expect(result[0]?.planId).toBe(mockPlanEmbedding.planId);
      expect(result[0]?.content).toBe(mockPlanEmbedding.content);
    });

    test('returns empty array when no embeddings for plan', async () => {
      vi.mocked(planEmbeddingsRepo.find).mockResolvedValue([]);

      const result = await resolver.planEmbeddings({
        planId: mockPlanEmbedding.planId,
      });

      expect(result).toEqual([]);
    });

    test('applies the default cap (take 1000, skip 0) when no limit/offset', async () => {
      vi.mocked(planEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.planEmbeddings({ planId: mockPlanEmbedding.planId });

      expect(planEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1000 }),
      );
    });

    test('passes through an explicit limit/offset', async () => {
      vi.mocked(planEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.planEmbeddings({
        limit: 50,
        offset: 10,
        planId: mockPlanEmbedding.planId,
      });

      expect(planEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 50 }),
      );
    });

    test('clamps a limit above the max down to 1000', async () => {
      vi.mocked(planEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.planEmbeddings({
        limit: 5000,
        planId: mockPlanEmbedding.planId,
      });

      expect(planEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    test('clamps a non-positive limit up to 1 and a negative offset to 0', async () => {
      vi.mocked(planEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.planEmbeddings({
        limit: 0,
        offset: -5,
        planId: mockPlanEmbedding.planId,
      });

      expect(planEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
    });
  });

  describe('plan (ResolveField)', () => {
    test('resolves the plan through planLoader when planId is set', async () => {
      mockPlanLoad.mockResolvedValueOnce(mockPlan);

      const parent = {
        content: mockPlanEmbedding.content,
        createdAt: mockPlanEmbedding.createdAt,
        id: mockPlanEmbedding.id,
        metadataJson: JSON.stringify(mockPlanEmbedding.metadata ?? {}),
        plan: null,
        planId: mockPlanEmbedding.planId,
      };

      const result = await resolver.plan(parent);

      expect(mockPlanLoad).toHaveBeenCalledWith(mockPlanEmbedding.planId);
      expect(result).toBe(mockPlan);
    });

    test('returns null without hitting the loader when planId is missing', async () => {
      mockPlanLoad.mockClear();

      const parent = {
        content: mockPlanEmbedding.content,
        createdAt: mockPlanEmbedding.createdAt,
        id: mockPlanEmbedding.id,
        metadataJson: JSON.stringify(mockPlanEmbedding.metadata ?? {}),
        plan: null,
        planId: '',
      };

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
      expect(mockPlanLoad).not.toHaveBeenCalled();
    });

    test('returns null when planLoader resolves null', async () => {
      mockPlanLoad.mockResolvedValueOnce(null);

      const parent = {
        content: mockPlanEmbedding.content,
        createdAt: mockPlanEmbedding.createdAt,
        id: mockPlanEmbedding.id,
        metadataJson: JSON.stringify(mockPlanEmbedding.metadata ?? {}),
        plan: null,
        planId: 'non-existent-plan-id',
      };

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });
  });
});
