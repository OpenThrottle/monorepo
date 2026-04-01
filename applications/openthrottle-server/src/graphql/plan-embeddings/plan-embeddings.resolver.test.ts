import type { Plan, PlanEmbedding } from '@openthrottle/nestjs-repositories';
import {
  PlanEmbeddingsService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { PlanEmbeddingsResolver } from './plan-embeddings.resolver';

const planEmbeddingsRepo = { find: vi.fn(), findOne: vi.fn() };
const plansRepo = { findOne: vi.fn() };

const mockPlanEmbeddingsService = createMock<PlanEmbeddingsService>({
  getRepository: vi.fn().mockReturnValue(planEmbeddingsRepo),
});
const mockPlansService = createMock<PlansService>({
  getRepository: vi.fn().mockReturnValue(plansRepo),
});

describe('PlanEmbeddingsResolver', () => {
  let resolver: PlanEmbeddingsResolver;

  const mockPlan: Plan = {
    assignee: null,
    author: 'Plan author',
    category: 'Plan category',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    description: 'Plan description',
    id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    project: null,
    projectId: null,
    status: 'IN_PROGRESS',
    summary: null,
    title: 'Plan title',
    updatedAt: new Date('2026-02-01T22:00:00.000Z'),
  } as Plan;

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
      status: 'IN_PROGRESS',
      summary: 'Plan summary',
      tasks: [],
      title: 'Plan title',
      updatedAt: new Date('2026-02-01T22:00:00.000Z'),
    },
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
  } as PlanEmbedding;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanEmbeddingsResolver,
        {
          provide: PlanEmbeddingsService,
          useValue: mockPlanEmbeddingsService,
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
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
  });

  describe('plan (ResolveField)', () => {
    test('returns PlanObject when plan exists', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(mockPlan);

      const parent = {
        content: mockPlanEmbedding.content,
        createdAt: mockPlanEmbedding.createdAt,
        id: mockPlanEmbedding.id,
        metadataJson: JSON.stringify(mockPlanEmbedding.metadata ?? {}),
        plan: null,
        planId: mockPlanEmbedding.planId,
      };

      const result = await resolver.plan(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.title).toBe(mockPlan.title);
      expect(result?.author).toBe(mockPlan.author);
    });

    test('returns null when planId is missing', async () => {
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
    });

    test('returns null when plan does not exist', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(null);

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
