import { Test } from '@nestjs/testing';
import { PUB_SUB } from '@openthrottle/nestjs-graphql';
import type { PlanOutputStreamChunk } from '@openthrottle/nestjs-repositories-server';
import { PlanOutputStreamRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createPlanOutputStreamRepositoryMock,
  planOutputStreamFactory,
  plansFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { PlanOutputStreamResolver } from './plan-output-stream.resolver.ts';

const mockAsyncIterator = { next: vi.fn(), return: vi.fn(), throw: vi.fn() };
const mockPubSub = {
  asyncIterableIterator: vi.fn().mockReturnValue(mockAsyncIterator),
  publish: vi.fn().mockResolvedValue(undefined),
};

const planOutputStreamRepo = createPlanOutputStreamRepositoryMock();

describe('PlanOutputStreamResolver', () => {
  let resolver: PlanOutputStreamResolver;

  const mockPlan = plansFactory.build({
    id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    status: 'IN_PROGRESS',
  });

  const mockChunk: PlanOutputStreamChunk = planOutputStreamFactory.build({
    content: 'Iteration output chunk',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    id: 'fe000420-9f10-4d74-b7f2-d9c5c211ed50',
    iteration: 1,
    kind: null,
    plan: mockPlan,
    planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
    taskId: null,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        PlanOutputStreamResolver,
        {
          provide: PlanOutputStreamRepository,
          useValue: planOutputStreamRepo,
        },
        { provide: PUB_SUB, useValue: mockPubSub },
      ],
    }).compile();

    resolver = app.get<PlanOutputStreamResolver>(PlanOutputStreamResolver);
  });

  describe('planOutputStreamChunk', () => {
    test('returns PlanOutputStreamChunkObject when chunk exists', async () => {
      planOutputStreamRepo.findOne.mockResolvedValue(mockChunk);

      const result = await resolver.planOutputStreamChunk({ id: mockChunk.id });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockChunk.id);
      expect(result?.planId).toBe(mockChunk.planId);
      expect(result?.content).toBe(mockChunk.content);
      expect(result?.iteration).toBe(mockChunk.iteration);
      expect(result?.createdAt).toEqual(mockChunk.createdAt);
    });

    test('returns null when chunk does not exist', async () => {
      planOutputStreamRepo.findOne.mockResolvedValue(null);

      const result = await resolver.planOutputStreamChunk({
        id: 'non-existent-id',
      });

      expect(result).toBeNull();
    });
  });

  describe('planOutputStreamChunks', () => {
    test('returns array of PlanOutputStreamChunkObjects for planId', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([mockChunk]);

      const result = await resolver.planOutputStreamChunks({
        planId: mockChunk.planId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockChunk.id);
      expect(result[0]?.planId).toBe(mockChunk.planId);
      expect(result[0]?.content).toBe(mockChunk.content);
    });

    test('returns empty array when no chunks for plan', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([]);

      const result = await resolver.planOutputStreamChunks({
        planId: mockChunk.planId,
      });

      expect(result).toEqual([]);
    });

    test('applies the default cap (take 1000, skip 0) when no limit/offset', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([]);

      await resolver.planOutputStreamChunks({ planId: mockChunk.planId });

      expect(planOutputStreamRepo.listChunks).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1000 }),
      );
    });

    test('passes through an explicit limit/offset', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([]);

      await resolver.planOutputStreamChunks({
        limit: 50,
        offset: 10,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.listChunks).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 50 }),
      );
    });

    test('clamps a limit above the max down to 1000', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([]);

      await resolver.planOutputStreamChunks({
        limit: 5000,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.listChunks).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    test('clamps a non-positive limit up to 1 and a negative offset to 0', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([]);

      await resolver.planOutputStreamChunks({
        limit: 0,
        offset: -5,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.listChunks).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
    });

    test('does not pass a taskId to the service when omitted from input', async () => {
      planOutputStreamRepo.listChunks.mockResolvedValue([]);

      await resolver.planOutputStreamChunks({ planId: mockChunk.planId });

      expect(planOutputStreamRepo.listChunks).toHaveBeenCalledWith(
        expect.objectContaining({ taskId: undefined }),
      );
    });

    test('forwards taskId to the service when provided (task-scoped filter)', async () => {
      const taskId = '9b1f0c3a-2d4e-4f6a-8b0c-1d2e3f4a5b6c';
      planOutputStreamRepo.listChunks.mockResolvedValue([
        { ...mockChunk, taskId },
      ]);

      const result = await resolver.planOutputStreamChunks({
        planId: mockChunk.planId,
        taskId,
      });

      expect(planOutputStreamRepo.listChunks).toHaveBeenCalledWith(
        expect.objectContaining({ planId: mockChunk.planId, taskId }),
      );
      expect(result[0]?.taskId).toBe(taskId);
    });
  });

  describe('appendPlanOutput', () => {
    test('returns saved PlanOutputStreamChunkObject', async () => {
      planOutputStreamRepo.create.mockImplementation(async (input) => {
        return planOutputStreamFactory.build({ ...input, id: 'new-chunk-id' });
      });

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

    test('persists a valid kind and defaults to null when omitted', async () => {
      planOutputStreamRepo.create.mockImplementation(async (input) => {
        return planOutputStreamFactory.build(input);
      });

      const tagged = await resolver.appendPlanOutput({
        content: 'tagged',
        iteration: null,
        kind: 'validation',
        planId: mockChunk.planId,
        taskId: null,
      });
      const untagged = await resolver.appendPlanOutput({
        content: 'untagged',
        iteration: null,
        planId: mockChunk.planId,
        taskId: null,
      });

      expect(tagged.kind).toBe('validation');
      expect(untagged.kind).toBeNull();
    });

    test('rejects an unknown kind without saving', async () => {
      await expect(
        resolver.appendPlanOutput({
          content: 'bad',
          iteration: null,
          kind: 'bogus',
          planId: mockChunk.planId,
          taskId: null,
        }),
      ).rejects.toThrow(/Invalid plan output kind "bogus"/);
      expect(planOutputStreamRepo.create).not.toHaveBeenCalled();
    });

    test('passes null iteration when omitted', async () => {
      planOutputStreamRepo.create.mockImplementation(async (input) => {
        return planOutputStreamFactory.build(input);
      });

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
      planOutputStreamRepo.create.mockImplementation(async (input) => {
        return planOutputStreamFactory.build(input);
      });

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
      planOutputStreamRepo.create.mockImplementation(async (input) => {
        return planOutputStreamFactory.build(input);
      });

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
      planOutputStreamRepo.findOne.mockResolvedValue(mockChunk);
      planOutputStreamRepo.remove.mockResolvedValue(mockChunk);

      const result = await resolver.deletePlanOutput({
        chunkId: mockChunk.id,
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.remove).toHaveBeenCalledWith(mockChunk.id);
      expect(result.deletedCount).toBe(1);
    });

    test('clears all chunks for a plan when no chunkId is given', async () => {
      planOutputStreamRepo.removeMany.mockResolvedValue({ removedCount: 3 });

      const result = await resolver.deletePlanOutput({
        planId: mockChunk.planId,
      });

      expect(planOutputStreamRepo.findOne).not.toHaveBeenCalled();
      expect(planOutputStreamRepo.removeMany).toHaveBeenCalledWith({
        planId: mockChunk.planId,
      });
      expect(result.deletedCount).toBe(3);
    });

    test('scopes the clear to a taskId when provided', async () => {
      const taskId = '9b1f0c3a-2d4e-4f6a-8b0c-1d2e3f4a5b6c';
      planOutputStreamRepo.removeMany.mockResolvedValue({ removedCount: 2 });

      const result = await resolver.deletePlanOutput({
        planId: mockChunk.planId,
        taskId,
      });

      expect(planOutputStreamRepo.removeMany).toHaveBeenCalledWith({
        planId: mockChunk.planId,
        taskId,
      });
      expect(result.deletedCount).toBe(2);
    });

    test('returns deletedCount 0 when the clear affects nothing', async () => {
      planOutputStreamRepo.removeMany.mockResolvedValue({ removedCount: 0 });

      const result = await resolver.deletePlanOutput({
        planId: mockChunk.planId,
      });

      expect(result.deletedCount).toBe(0);
    });

    test('throws when the chunk does not exist', async () => {
      planOutputStreamRepo.findOne.mockResolvedValue(null);

      await expect(
        resolver.deletePlanOutput({
          chunkId: 'missing-chunk-id',
          planId: mockChunk.planId,
        }),
      ).rejects.toThrow(/not found/);
      expect(planOutputStreamRepo.remove).not.toHaveBeenCalled();
    });

    test('throws when the chunk belongs to a different plan', async () => {
      planOutputStreamRepo.findOne.mockResolvedValue({
        ...mockChunk,
        planId: 'a-different-plan-id',
      });

      await expect(
        resolver.deletePlanOutput({
          chunkId: mockChunk.id,
          planId: mockChunk.planId,
        }),
      ).rejects.toThrow(/does not belong/);
      expect(planOutputStreamRepo.remove).not.toHaveBeenCalled();
    });
  });

  describe('planOutputChunkAdded (Subscription)', () => {
    test('returns an async iterator on the per-plan output topic when authenticated', () => {
      const iterator = resolver.planOutputChunkAdded(mockChunk.planId, {
        userId: 'user-1',
      });

      expect(mockPubSub.asyncIterableIterator).toHaveBeenCalledWith(
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
