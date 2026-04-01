import type {
  Plan,
  PlanOutputStreamChunk,
} from '@openthrottle/nestjs-repositories';
import {
  PlanOutputStreamService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { PlanOutputStreamResolver } from './plan-output-stream.resolver';

const planOutputStreamRepo = {
  create: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
};
const plansRepo = { findOne: vi.fn() };

const mockPlanOutputStreamService = createMock<PlanOutputStreamService>({
  getRepository: vi.fn().mockReturnValue(planOutputStreamRepo),
});
const mockPlansService = createMock<PlansService>({
  getRepository: vi.fn().mockReturnValue(plansRepo),
});

describe('PlanOutputStreamResolver', () => {
  let resolver: PlanOutputStreamResolver;

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

  const mockChunk: PlanOutputStreamChunk = {
    content: 'Iteration output chunk',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    id: 'fe000420-9f10-4d74-b7f2-d9c5c211ed50',
    iteration: 1,
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
  } as PlanOutputStreamChunk;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanOutputStreamResolver,
        {
          provide: PlanOutputStreamService,
          useValue: mockPlanOutputStreamService,
        },
        {
          provide: PlansService,
          useValue: mockPlansService,
        },
      ],
    }).compile();

    resolver = app.get<PlanOutputStreamResolver>(PlanOutputStreamResolver);
  });

  describe('planOutputStreamChunk', () => {
    test('returns PlanOutputStreamChunkObject when chunk exists', async () => {
      vi.mocked(planOutputStreamRepo.findOne).mockResolvedValue(mockChunk);

      const result = await resolver.planOutputStreamChunk({ id: mockChunk.id });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockChunk.id);
      expect(result?.planId).toBe(mockChunk.planId);
      expect(result?.content).toBe(mockChunk.content);
      expect(result?.iteration).toBe(mockChunk.iteration);
      expect(result?.createdAt).toEqual(mockChunk.createdAt);
    });

    test('returns null when chunk does not exist', async () => {
      vi.mocked(planOutputStreamRepo.findOne).mockResolvedValue(null);

      const result = await resolver.planOutputStreamChunk({
        id: 'non-existent-id',
      });

      expect(result).toBeNull();
    });
  });

  describe('planOutputStreamChunks', () => {
    test('returns array of PlanOutputStreamChunkObjects for planId', async () => {
      vi.mocked(planOutputStreamRepo.find).mockResolvedValue([mockChunk]);

      const result = await resolver.planOutputStreamChunks({
        planId: mockChunk.planId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockChunk.id);
      expect(result[0]?.planId).toBe(mockChunk.planId);
      expect(result[0]?.content).toBe(mockChunk.content);
    });

    test('returns empty array when no chunks for plan', async () => {
      vi.mocked(planOutputStreamRepo.find).mockResolvedValue([]);

      const result = await resolver.planOutputStreamChunks({
        planId: mockChunk.planId,
      });

      expect(result).toEqual([]);
    });
  });

  describe('appendPlanOutput', () => {
    test('returns saved PlanOutputStreamChunkObject', async () => {
      const create = vi.fn().mockReturnValue({
        content: 'New output',
        createdAt: new Date('2026-02-01T23:00:00.000Z'),
        id: 'new-chunk-id',
        iteration: 2,
        planId: mockChunk.planId,
      });
      const save = vi
        .fn()
        .mockImplementation((entity: { planId: string }) =>
          Promise.resolve({ ...entity, id: 'new-chunk-id' }),
        );
      vi.mocked(planOutputStreamRepo.create).mockImplementation(
        create as never,
      );
      vi.mocked(planOutputStreamRepo.save).mockImplementation(save as never);

      const result = await resolver.appendPlanOutput({
        content: 'New output',
        iteration: 2,
        planId: mockChunk.planId,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe('new-chunk-id');
      expect(result.planId).toBe(mockChunk.planId);
      expect(result.content).toBe('New output');
      expect(result.iteration).toBe(2);
    });

    test('passes null iteration when omitted', async () => {
      const created = {
        content: 'No iteration',
        createdAt: new Date(),
        id: 'id-2',
        iteration: null,
        planId: mockChunk.planId,
      };
      vi.mocked(planOutputStreamRepo.create).mockReturnValue(created as never);
      vi.mocked(planOutputStreamRepo.save).mockResolvedValue(created as never);

      const result = await resolver.appendPlanOutput({
        content: 'No iteration',
        iteration: null,
        planId: mockChunk.planId,
      });

      expect(result.iteration).toBeNull();
    });
  });

  describe('plan (ResolveField)', () => {
    test('returns PlanObject when plan exists', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(mockPlan);

      const parent = {
        content: mockChunk.content,
        createdAt: mockChunk.createdAt,
        id: mockChunk.id,
        iteration: mockChunk.iteration,
        plan: null,
        planId: mockChunk.planId,
      };

      const result = await resolver.plan(parent);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockPlan.id);
      expect(result?.title).toBe(mockPlan.title);
      expect(result?.author).toBe(mockPlan.author);
    });

    test('returns null when planId is missing', async () => {
      const parent = {
        content: mockChunk.content,
        createdAt: mockChunk.createdAt,
        id: mockChunk.id,
        iteration: mockChunk.iteration,
        plan: null,
        planId: '',
      };

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });

    test('returns null when plan does not exist', async () => {
      vi.mocked(plansRepo.findOne).mockResolvedValue(null);

      const parent = {
        content: mockChunk.content,
        createdAt: mockChunk.createdAt,
        id: mockChunk.id,
        iteration: mockChunk.iteration,
        plan: null,
        planId: 'non-existent-plan-id',
      };

      const result = await resolver.plan(parent);

      expect(result).toBeNull();
    });
  });
});
