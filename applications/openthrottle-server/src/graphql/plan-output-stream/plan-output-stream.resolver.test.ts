import type {
  Plan,
  PlanOutputStreamChunk,
} from '@openthrottle/nestjs-repositories';
import {
  PlanOutputStreamService,
  getDefaultPlanRunConfigStorage,
} from '@openthrottle/nestjs-repositories';
import { PUB_SUB } from '@openthrottle/nestjs-graphql';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { PlanOutputStreamResolver } from './plan-output-stream.resolver';

const mockAsyncIterator = { next: vi.fn(), return: vi.fn(), throw: vi.fn() };
const mockPubSub = {
  asyncIterator: vi.fn().mockReturnValue(mockAsyncIterator),
  publish: vi.fn().mockResolvedValue(undefined),
};

const planOutputStreamRepo = {
  create: vi.fn(),
  delete: vi.fn(),
  find: vi.fn(),
  findOne: vi.fn(),
  save: vi.fn(),
};

const mockPlanOutputStreamService = createMock<PlanOutputStreamService>({
  getRepository: vi.fn().mockReturnValue(planOutputStreamRepo),
});

describe('PlanOutputStreamResolver', () => {
  let resolver: PlanOutputStreamResolver;

  const mockPlan: Plan = {
    assignee: null,
    author: 'Plan author',
    category: 'Plan category',
    completedAt: null,
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

  const mockChunk: PlanOutputStreamChunk = {
    content: 'Iteration output chunk',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    id: 'fe000420-9f10-4d74-b7f2-d9c5c211ed50',
    iteration: 1,
    plan: mockPlan,
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    taskId: null,
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanOutputStreamResolver,
        {
          provide: PlanOutputStreamService,
          useValue: mockPlanOutputStreamService,
        },
        { provide: PUB_SUB, useValue: mockPubSub },
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

    test('applies the default cap (take 1000, skip 0) when no limit/offset', async () => {
      vi.mocked(planOutputStreamRepo.find).mockResolvedValue([]);

      await resolver.planOutputStreamChunks({ planId: mockChunk.planId });

      expect(planOutputStreamRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1000 }),
      );
    });

    test('passes through an explicit limit/offset', async () => {
      vi.mocked(planOutputStreamRepo.find).mockResolvedValue([]);

      await resolver.planOutputStreamChunks({
        limit: 50,
        offset: 10,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 50 }),
      );
    });

    test('clamps a limit above the max down to 1000', async () => {
      vi.mocked(planOutputStreamRepo.find).mockResolvedValue([]);

      await resolver.planOutputStreamChunks({
        limit: 5000,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    test('clamps a non-positive limit up to 1 and a negative offset to 0', async () => {
      vi.mocked(planOutputStreamRepo.find).mockResolvedValue([]);

      await resolver.planOutputStreamChunks({
        limit: 0,
        offset: -5,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
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
      vi.mocked(planOutputStreamRepo.create).mockImplementation(create);
      vi.mocked(planOutputStreamRepo.save).mockImplementation(save);

      const result = await resolver.appendPlanOutput({
        content: 'New output',
        iteration: 2,
        planId: mockChunk.planId,
        taskId: null,
      });

      expect(result).not.toBeNull();
      expect(result.id).toBe('new-chunk-id');
      expect(result.planId).toBe(mockChunk.planId);
      expect(result.content).toBe('New output');
      expect(result.iteration).toBe(2);
      expect(mockPubSub.publish).toHaveBeenCalledWith(
        `plan:${mockChunk.planId}:output`,
        { planOutputChunkAdded: { ...result } },
      );
    });

    test('passes null iteration when omitted', async () => {
      const created = {
        content: 'No iteration',
        createdAt: new Date(),
        id: 'id-2',
        iteration: null,
        planId: mockChunk.planId,
        taskId: null,
      };
      vi.mocked(planOutputStreamRepo.create).mockReturnValue(created);
      vi.mocked(planOutputStreamRepo.save).mockResolvedValue(created);

      const result = await resolver.appendPlanOutput({
        content: 'No iteration',
        iteration: null,
        planId: mockChunk.planId,
        taskId: null,
      });

      expect(result.iteration).toBeNull();
    });

    test('forwards taskId into create and returns it when provided', async () => {
      const taskId = '9b1f0c3a-2d4e-4f6a-8b0c-1d2e3f4a5b6c';
      const created = {
        content: 'Task-scoped output',
        createdAt: new Date('2026-02-01T23:30:00.000Z'),
        id: 'task-chunk-id',
        iteration: 3,
        planId: mockChunk.planId,
        taskId,
      };
      vi.mocked(planOutputStreamRepo.create).mockReturnValue(created);
      vi.mocked(planOutputStreamRepo.save).mockResolvedValue(created);

      const result = await resolver.appendPlanOutput({
        content: 'Task-scoped output',
        iteration: 3,
        planId: mockChunk.planId,
        taskId,
      });

      expect(planOutputStreamRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ taskId }),
      );
      expect(result.taskId).toBe(taskId);
    });

    test('defaults taskId to null when omitted', async () => {
      const created = {
        content: 'Plan-scoped output',
        createdAt: new Date(),
        id: 'id-3',
        iteration: null,
        planId: mockChunk.planId,
        taskId: null,
      };
      vi.mocked(planOutputStreamRepo.create).mockReturnValue(created);
      vi.mocked(planOutputStreamRepo.save).mockResolvedValue(created);

      await resolver.appendPlanOutput({
        content: 'Plan-scoped output',
        iteration: null,
        planId: mockChunk.planId,
        taskId: null,
      });

      expect(planOutputStreamRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: null }),
      );
    });
  });

  describe('deletePlanOutput', () => {
    test('deletes a single chunk by id when it belongs to the plan', async () => {
      vi.mocked(planOutputStreamRepo.findOne).mockResolvedValue(mockChunk);
      vi.mocked(planOutputStreamRepo.delete).mockResolvedValue({ affected: 1 });

      const result = await resolver.deletePlanOutput({
        chunkId: mockChunk.id,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.delete).toHaveBeenCalledWith({
        id: mockChunk.id,
      });
      expect(result.deletedCount).toBe(1);
    });

    test('clears all chunks for a plan when no chunkId is given', async () => {
      // Shared module-level mocks accumulate calls across tests; clear findOne
      // so the "no chunk lookup on the clear path" assertion is meaningful.
      vi.mocked(planOutputStreamRepo.findOne).mockClear();
      vi.mocked(planOutputStreamRepo.delete).mockResolvedValue({ affected: 3 });

      const result = await resolver.deletePlanOutput({
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.findOne).not.toHaveBeenCalled();
      expect(planOutputStreamRepo.delete).toHaveBeenCalledWith({
        planId: mockChunk.planId,
      });
      expect(result.deletedCount).toBe(3);
    });

    test('scopes the clear to a taskId when provided', async () => {
      const taskId = '9b1f0c3a-2d4e-4f6a-8b0c-1d2e3f4a5b6c';
      vi.mocked(planOutputStreamRepo.delete).mockResolvedValue({ affected: 2 });

      const result = await resolver.deletePlanOutput({
        planId: mockChunk.planId,
        taskId,
      });

      expect(planOutputStreamRepo.delete).toHaveBeenCalledWith({
        planId: mockChunk.planId,
        taskId,
      });
      expect(result.deletedCount).toBe(2);
    });

    test('returns deletedCount 0 when the clear affects nothing', async () => {
      vi.mocked(planOutputStreamRepo.delete).mockResolvedValue({
        affected: null,
      });

      const result = await resolver.deletePlanOutput({
        planId: mockChunk.planId,
      });

      expect(result.deletedCount).toBe(0);
    });

    test('throws when the chunk does not exist', async () => {
      vi.mocked(planOutputStreamRepo.findOne).mockResolvedValue(null);
      vi.mocked(planOutputStreamRepo.delete).mockClear();

      await expect(
        resolver.deletePlanOutput({
          chunkId: 'missing-chunk-id',
          planId: mockChunk.planId,
        }),
      ).rejects.toThrow(/not found/);
      expect(planOutputStreamRepo.delete).not.toHaveBeenCalled();
    });

    test('throws when the chunk belongs to a different plan', async () => {
      vi.mocked(planOutputStreamRepo.findOne).mockResolvedValue({
        ...mockChunk,
        planId: 'a-different-plan-id',
      });
      vi.mocked(planOutputStreamRepo.delete).mockClear();

      await expect(
        resolver.deletePlanOutput({
          chunkId: mockChunk.id,
          planId: mockChunk.planId,
        }),
      ).rejects.toThrow(/does not belong/);
      expect(planOutputStreamRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('planOutputChunkAdded (Subscription)', () => {
    test('returns an async iterator on the per-plan output topic when authenticated', () => {
      const iterator = resolver.planOutputChunkAdded(mockChunk.planId, {
        userId: 'user-1',
      });

      expect(mockPubSub.asyncIterator).toHaveBeenCalledWith(
        `plan:${mockChunk.planId}:output`,
      );
      expect(iterator).toBe(mockAsyncIterator);
    });

    test('throws when the connection carries no userId', () => {
      expect(() => resolver.planOutputChunkAdded(mockChunk.planId, {})).toThrow(
        /authenticated connection/,
      );
    });
  });
});
