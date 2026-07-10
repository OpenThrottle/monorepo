import type { TaskEmbedding } from '@openthrottle/nestjs-repositories';
import {
  TaskEmbeddingsService,
  getDefaultPlanRunConfigStorage,
  tasksFactory,
} from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { describe, expect, beforeAll, test, vi } from 'vitest';
import { TaskEmbeddingsLoaders } from './task-embeddings-loaders';
import { TaskEmbeddingsResolver } from './task-embeddings.resolver';

const taskEmbeddingsRepo = { find: vi.fn(), findOne: vi.fn() };

const mockTaskEmbeddingsService = createMock<TaskEmbeddingsService>({
  getRepository: vi.fn().mockReturnValue(taskEmbeddingsRepo),
});
const mockTaskLoad = vi.fn().mockResolvedValue(null);
const mockLoaders: TaskEmbeddingsLoaders = createMock<TaskEmbeddingsLoaders>({
  taskLoader: { load: mockTaskLoad },
});

describe('TaskEmbeddingsResolver', () => {
  let resolver: TaskEmbeddingsResolver;

  const mockTaskEmbedding: TaskEmbedding = {
    content: 'Task content chunk for embedding',
    createdAt: new Date('2026-02-01T22:00:00.000Z'),
    embedding: null,
    id: '23c58683-01de-4fdd-b484-ea9ad2c0c5b8',
    metadata: { source: 'task' },
    task: {
      assignee: 'Task assignee',
      category: 'Task category',
      commitLinks: [],
      createdAt: new Date('2026-02-01T22:00:00.000Z'),
      description: 'Task description',
      id: 'b366d480-6a4f-498b-8755-23ade25d2b24',
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
        status: 'Plan status',
        summary: 'Plan summary',
        tasks: [],
        title: 'Plan title',
        updatedAt: new Date('2026-02-01T22:00:00.000Z'),
      },
      planId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      project: 'Task project',
      projectId: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
      projectRelation: {
        createdAt: new Date('2026-02-01T22:00:00.000Z'),
        description: 'Task project description',
        id: 'c70fc1ea-c7de-4fe8-9722-44781ad80415',
        name: 'Task project name',
        nxProjectName: 'Task project nx project name',
        plans: [],
        tasks: [],
        updatedAt: new Date('2026-02-01T22:00:00.000Z'),
      },
      requirements: ['Task requirement 1', 'Task requirement 2'],
      sortOrder: 1000,
      status: 'Task status',
      summary: 'Task summary',
      taskEmbeddings: [],
      title: 'Task title',
      updatedAt: new Date('2026-02-01T22:00:00.000Z'),
    },
    taskId: 'b366d480-6a4f-498b-8755-23ade25d2b24',
  };

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        TaskEmbeddingsResolver,
        { provide: TaskEmbeddingsService, useValue: mockTaskEmbeddingsService },
        { provide: TaskEmbeddingsLoaders, useValue: mockLoaders },
      ],
    }).compile();

    resolver = app.get<TaskEmbeddingsResolver>(TaskEmbeddingsResolver);
  });

  describe('task (ResolveField)', () => {
    test('resolves the task through taskLoader when taskId is set', async () => {
      const parent = {
        content: 'chunk',
        createdAt: new Date(),
        id: 'embed-id',
        metadataJson: '{}',
        task: null,
        taskId: 'b366d480-6a4f-498b-8755-23ade25d2b24',
      };
      const mockTask = tasksFactory.build({
        id: 'b366d480-6a4f-498b-8755-23ade25d2b24',
        title: 'Task title',
      });
      mockTaskLoad.mockResolvedValueOnce(mockTask);

      const result = await resolver.task(parent);

      expect(mockTaskLoad).toHaveBeenCalledWith(parent.taskId);
      expect(result).toBe(mockTask);
    });

    test('returns null without hitting the loader when taskId is missing', async () => {
      mockTaskLoad.mockClear();

      const parent = {
        content: 'chunk',
        createdAt: new Date(),
        id: 'embed-id',
        metadataJson: '{}',
        task: null,
        taskId: '',
      };

      const result = await resolver.task(parent);

      expect(result).toBeNull();
      expect(mockTaskLoad).not.toHaveBeenCalled();
    });

    test('returns null when taskLoader resolves null', async () => {
      const parent = {
        content: 'chunk',
        createdAt: new Date(),
        id: 'embed-id',
        metadataJson: '{}',
        task: null,
        taskId: 'non-existent-task-id',
      };
      mockTaskLoad.mockResolvedValueOnce(null);

      const result = await resolver.task(parent);

      expect(result).toBeNull();
    });
  });

  describe('taskEmbedding', () => {
    test('returns TaskEmbeddingObject when embedding exists', async () => {
      vi.mocked(taskEmbeddingsRepo.findOne).mockResolvedValue(
        mockTaskEmbedding,
      );

      const result = await resolver.taskEmbedding({
        id: mockTaskEmbedding.id,
      });

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTaskEmbedding.id);
      expect(result?.taskId).toBe(mockTaskEmbedding.taskId);
      expect(result?.content).toBe(mockTaskEmbedding.content);
      expect(result?.metadata).toEqual(mockTaskEmbedding.metadata ?? {});
      expect(result?.createdAt).toEqual(mockTaskEmbedding.createdAt);
    });

    test('returns null when embedding does not exist', async () => {
      vi.mocked(taskEmbeddingsRepo.findOne).mockResolvedValue(null);

      const result = await resolver.taskEmbedding({ id: 'non-existent-id' });

      expect(result).toBeNull();
    });
  });

  describe('taskEmbeddings', () => {
    test('returns array of TaskEmbeddingObjects for taskId', async () => {
      vi.mocked(taskEmbeddingsRepo.find).mockResolvedValue([mockTaskEmbedding]);

      const result = await resolver.taskEmbeddings({
        taskId: mockTaskEmbedding.taskId,
      });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe(mockTaskEmbedding.id);
      expect(result[0]?.taskId).toBe(mockTaskEmbedding.taskId);
      expect(result[0]?.content).toBe(mockTaskEmbedding.content);
    });

    test('returns empty array when no embeddings for task', async () => {
      vi.mocked(taskEmbeddingsRepo.find).mockResolvedValue([]);

      const result = await resolver.taskEmbeddings({
        taskId: mockTaskEmbedding.taskId,
      });

      expect(result).toEqual([]);
    });

    test('applies the default cap (take 1000, skip 0) when no limit/offset', async () => {
      vi.mocked(taskEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.taskEmbeddings({ taskId: mockTaskEmbedding.taskId });

      expect(taskEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1000 }),
      );
    });

    test('passes through an explicit limit/offset', async () => {
      vi.mocked(taskEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.taskEmbeddings({
        limit: 50,
        offset: 10,
        taskId: mockTaskEmbedding.taskId,
      });

      expect(taskEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 50 }),
      );
    });

    test('clamps a limit above the max down to 1000', async () => {
      vi.mocked(taskEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.taskEmbeddings({
        limit: 5000,
        taskId: mockTaskEmbedding.taskId,
      });

      expect(taskEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1000 }),
      );
    });

    test('clamps a non-positive limit up to 1 and a negative offset to 0', async () => {
      vi.mocked(taskEmbeddingsRepo.find).mockResolvedValue([]);

      await resolver.taskEmbeddings({
        limit: 0,
        offset: -5,
        taskId: mockTaskEmbedding.taskId,
      });

      expect(taskEmbeddingsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
    });
  });
});
