import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Task } from '../tasks/task.entity.ts';
import { TaskTag } from './task-tag.entity.ts';
import { taskTagsFactory } from './task-tags.factory.ts';
import { TaskTagsRepository } from './task-tags.repository.ts';

const planId = '22222222-2222-4222-8222-222222222222';
const taskId = '33333333-3333-4333-8333-333333333333';

describe('TaskTagsRepository', () => {
  const findOne = vi.fn();
  const builder = {
    andWhere: vi.fn(),
    getMany: vi.fn(),
    getRawMany: vi.fn(),
    innerJoin: vi.fn(),
    select: vi.fn(),
    where: vi.fn(),
  };
  let repository: TaskTagsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    findOne.mockResolvedValue(null);
    builder.andWhere.mockReturnValue(builder);
    builder.getMany.mockResolvedValue([]);
    builder.getRawMany.mockResolvedValue([]);
    builder.select.mockReturnValue(builder);
    builder.innerJoin.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);

    const app = await Test.createTestingModule({
      providers: [
        TaskTagsRepository,
        {
          provide: getRepositoryToken(TaskTag),
          useValue: createMock<Repository<TaskTag>>({
            createQueryBuilder: vi.fn(() => {
              return builder;
            }),
            findOne,
            target: TaskTag,
          }),
        },
      ],
    }).compile();

    repository = app.get(TaskTagsRepository);
  });

  describe('findByTaskAndTag', () => {
    it('looks the tag up on that task', async () => {
      const row = taskTagsFactory.build({ tag: 'backend', taskId });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByTaskAndTag(taskId, 'backend'),
      ).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({
        where: { tag: 'backend', taskId },
      });
    });
  });

  describe('listForPlan', () => {
    describe('in plan context', () => {
      it('joins the plan tasks and does not scope to one task', async () => {
        const rows = taskTagsFactory.buildList(2);
        builder.getMany.mockResolvedValue(rows);

        await expect(repository.listForPlan(planId)).resolves.toEqual(rows);
        expect(builder.innerJoin).toHaveBeenCalledWith(
          Task,
          'task',
          'task.id = taskTag.task_id',
        );
        expect(builder.where).toHaveBeenCalledWith('task.plan_id = :planId', {
          planId,
        });
        expect(builder.andWhere).not.toHaveBeenCalled();
      });
    });

    describe('in task context', () => {
      it('scopes the rows to the given task', async () => {
        await repository.listForPlan(planId, taskId);

        expect(builder.andWhere).toHaveBeenCalledWith(
          'taskTag.task_id = :taskId',
          { taskId },
        );
      });
    });
  });

  describe('listTaskIdsByPlanAndTags', () => {
    describe('when tags are given', () => {
      it('returns the distinct ids of the plan tasks carrying any of them', async () => {
        builder.getRawMany.mockResolvedValue([
          { taskId: 'task-a' },
          { taskId: 'task-b' },
        ]);

        await expect(
          repository.listTaskIdsByPlanAndTags(planId, ['backend', 'github']),
        ).resolves.toEqual(['task-a', 'task-b']);
        expect(builder.andWhere).toHaveBeenCalledWith(
          'taskTag.tag IN (:...tags)',
          { tags: ['backend', 'github'] },
        );
        expect(builder.select).toHaveBeenCalledWith(
          'DISTINCT taskTag.task_id',
          'taskId',
        );
      });
    });

    describe('when no tags are given', () => {
      it('returns nothing without querying', async () => {
        await expect(
          repository.listTaskIdsByPlanAndTags(planId, []),
        ).resolves.toEqual([]);
        expect(builder.getRawMany).not.toHaveBeenCalled();
      });
    });
  });
});
