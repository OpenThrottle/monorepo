/**
 * @description Unit tests for PlanTaskOrderService.
 */

import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TasksRepository } from '@openthrottle/nestjs-repositories-server';
import type { TasksRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createTasksRepositoryMock,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PlanTaskOrderService } from './plan-task-order.service.ts';

describe('PlanTaskOrderService', () => {
  let tasksRepository: TasksRepositoryMock;
  let service: PlanTaskOrderService;

  beforeEach(async () => {
    tasksRepository = createTasksRepositoryMock();

    const app = await Test.createTestingModule({
      providers: [
        PlanTaskOrderService,
        { provide: TasksRepository, useValue: tasksRepository },
      ],
    }).compile();

    service = app.get(PlanTaskOrderService);
  });

  describe('reorderTasks', () => {
    it('returns nothing for an empty list without writing', async () => {
      await expect(service.reorderTasks('plan-1', [])).resolves.toEqual([]);
      expect(tasksRepository.reorderInPlan).not.toHaveBeenCalled();
    });

    it('reorders through the repository and returns the tasks in list order', async () => {
      const [first, second] = tasksFactory.buildList(2, { planId: 'plan-1' });

      if (first === undefined || second === undefined) {
        throw new Error('factory built too few tasks');
      }
      tasksRepository.reorderInPlan.mockResolvedValue({
        assignments: [],
        kind: 'reordered',
      });
      tasksRepository.findBy.mockResolvedValue([first, second]);

      await expect(
        service.reorderTasks('plan-1', [second.id, first.id]),
      ).resolves.toEqual([second, first]);
      expect(tasksRepository.reorderInPlan).toHaveBeenCalledWith('plan-1', [
        second.id,
        first.id,
      ]);
    });

    it('rejects a duplicate id', async () => {
      tasksRepository.reorderInPlan.mockResolvedValue({
        duplicateIds: ['a'],
        kind: 'duplicate-ids',
      });

      await expect(service.reorderTasks('plan-1', ['a', 'a'])).rejects.toThrow(
        new BadRequestException('taskIds must not contain duplicates'),
      );
    });

    it('rejects an id that is not a live task of the plan', async () => {
      tasksRepository.reorderInPlan.mockResolvedValue({
        kind: 'ids-not-in-scope',
        missingIds: ['b'],
      });

      await expect(service.reorderTasks('plan-1', ['a', 'b'])).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
