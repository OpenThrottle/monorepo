/**
 * @description Unit tests for {@link TaskPromotionEnqueueService.enqueuePromotion}:
 * promotability validation (missing task, hook task, already-promoted) and the
 * enqueue happy path (idempotency key → jobId, default per-task key).
 */

import { createMock } from '@golevelup/ts-vitest';
import type { Task, TaskTag } from '@openthrottle/nestjs-repositories';
import {
  type TagsService,
  type TasksService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskPromotionEnqueueService } from './task-promotion-enqueue.service';
import type {
  PromoteTaskJobData,
  PromoteTaskJobResult,
} from './task-promotion.types';

const TASK_ID = '00000000-0000-4000-8000-000000000001';

describe('TaskPromotionEnqueueService.enqueuePromotion', () => {
  let tasksService: TasksService;
  let tagsService: TagsService;
  let queue: Queue<PromoteTaskJobData, PromoteTaskJobResult>;
  let service: TaskPromotionEnqueueService;
  let taskFindOne: ReturnType<typeof vi.fn>;
  let tagFindOne: ReturnType<typeof vi.fn>;

  const buildTask = (overrides: Partial<Task> = {}): Task =>
    asMock<Task>({
      hookRole: null,
      id: TASK_ID,
      status: 'PENDING',
      ...overrides,
    });

  beforeEach(() => {
    taskFindOne = vi.fn().mockResolvedValue(buildTask());
    tagFindOne = vi.fn().mockResolvedValue(null);

    tasksService = createMock<TasksService>({
      getRepository: vi.fn(() =>
        asMock<Repository<Task>>({ findOne: taskFindOne }),
      ),
    });
    tagsService = createMock<TagsService>({
      getTaskTagsRepository: vi.fn(() =>
        asMock<Repository<TaskTag>>({ findOne: tagFindOne }),
      ),
    });
    queue = createMock<Queue<PromoteTaskJobData, PromoteTaskJobResult>>({
      add: vi.fn().mockResolvedValue(asMock({ id: 'promote:job' })),
    });

    service = new TaskPromotionEnqueueService(tagsService, tasksService, queue);
  });

  it('enqueues with the caller idempotency key as the job id', async () => {
    const result = await service.enqueuePromotion({
      actorServiceAccountId: null,
      actorUserId: 'user-1',
      idempotencyKey: 'promote.key-1',
      taskId: TASK_ID,
    });

    expect(queue.add).toHaveBeenCalledWith(
      'promote',
      {
        actorServiceAccountId: null,
        actorUserId: 'user-1',
        idempotencyKey: 'promote.key-1',
        taskId: TASK_ID,
      },
      { jobId: 'promote.key-1' },
    );
    expect(result).toEqual({ jobId: 'promote:job' });
  });

  it('defaults the job id to promote-<taskId> (no colon; BullMQ rejects ":")', async () => {
    await service.enqueuePromotion({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    expect(queue.add).toHaveBeenCalledWith(
      'promote',
      expect.objectContaining({ idempotencyKey: `promote-${TASK_ID}` }),
      { jobId: `promote-${TASK_ID}` },
    );
  });

  it('rejects a bad idempotency key before touching the DB or queue', async () => {
    const result = await service.enqueuePromotion({
      actorServiceAccountId: null,
      actorUserId: null,
      idempotencyKey: 'has spaces!',
      taskId: TASK_ID,
    });

    expect('error' in result).toBe(true);
    expect(taskFindOne).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('errors when the task does not exist', async () => {
    taskFindOne.mockResolvedValue(null);

    const result = await service.enqueuePromotion({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    expect(result).toEqual({ error: `Task not found: ${TASK_ID}` });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects a lifecycle-hook task', async () => {
    taskFindOne.mockResolvedValue(buildTask({ hookRole: 'before' }));

    const result = await service.enqueuePromotion({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    expect(result).toEqual({
      error: 'Lifecycle-hook tasks cannot be promoted to a plan.',
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('rejects a task already promoted (SKIPPED + promoted tag)', async () => {
    taskFindOne.mockResolvedValue(buildTask({ status: 'SKIPPED' }));
    tagFindOne.mockResolvedValue(asMock<TaskTag>({ tag: 'promoted' }));

    const result = await service.enqueuePromotion({
      actorServiceAccountId: null,
      actorUserId: null,
      taskId: TASK_ID,
    });

    expect(result).toEqual({
      error: 'Task has already been promoted to a plan.',
    });
    expect(queue.add).not.toHaveBeenCalled();
  });
});
