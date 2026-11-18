/**
 * @description Unit tests for IdRefsService: prefix vs exact matching, the
 * plans-first merge, and the junk-input short circuit.
 */

import { Test } from '@nestjs/testing';
import type { Plan, Task } from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import type {
  PlansRepositoryMock,
  TasksRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import {
  createPlansRepositoryMock,
  createTasksRepositoryMock,
  plansFactory,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ID_REF_KIND } from './id-refs.enum.ts';
import { IdRefsService } from './id-refs.service.ts';

const PLAN_ID = '1e5089b4-94f1-449b-8d80-4edd82c47037';
const TASK_ID = '2e139d89-3dde-42f1-a51a-6899ef4e1e86';

const plan = plansFactory.build({
  id: PLAN_ID,
  status: 'IN_PROGRESS',
  title: 'Commander id lookup',
});

const task = tasksFactory.build({
  id: TASK_ID,
  plan: plansFactory.build({ id: PLAN_ID, title: 'Commander id lookup' }),
  planId: PLAN_ID,
  status: 'PENDING',
  title: 'Server query',
});

describe('IdRefsService', () => {
  let service: IdRefsService;
  let plans: PlansRepositoryMock;
  let tasks: TasksRepositoryMock;

  const setup = async (planRows: Plan[], taskRows: Task[]): Promise<void> => {
    plans = createPlansRepositoryMock();
    tasks = createTasksRepositoryMock();
    plans.findByIdPrefix.mockResolvedValue(planRows);
    plans.findBy.mockResolvedValue(planRows);
    tasks.findByIdPrefix.mockResolvedValue(taskRows);
    tasks.findBy.mockResolvedValue(taskRows);

    const moduleRef = await Test.createTestingModule({
      providers: [
        IdRefsService,
        { provide: PlansRepository, useValue: plans },
        { provide: TasksRepository, useValue: tasks },
      ],
    }).compile();

    service = moduleRef.get(IdRefsService);
  };

  describe('junk input', () => {
    beforeEach(async () => {
      await setup([plan], [task]);
    });

    it.each([
      ['too short', '1e50'],
      ['non-hex', 'zzzzzzzz'],
      ['longer than a UUID', `${PLAN_ID}0`],
      ['empty', '   '],
    ])('returns [] and never queries for %s input', async (_label, ref) => {
      await expect(service.resolve(ref)).resolves.toEqual([]);
      expect(plans.findByIdPrefix).not.toHaveBeenCalled();
      expect(plans.findBy).not.toHaveBeenCalled();
      expect(tasks.findByIdPrefix).not.toHaveBeenCalled();
      expect(tasks.findBy).not.toHaveBeenCalled();
    });
  });

  describe('short fragment', () => {
    it('resolves a plan by prefix with a bound LIKE pattern', async () => {
      await setup([plan], []);

      const result = await service.resolve('1E5089B4');

      expect(result).toEqual([
        {
          id: PLAN_ID,
          kind: ID_REF_KIND.PLAN,
          planId: null,
          planTitle: null,
          status: 'IN_PROGRESS',
          title: 'Commander id lookup',
        },
      ]);
      expect(plans.findByIdPrefix).toHaveBeenCalledWith('1e5089b4', 8);
    });

    it('resolves a task by prefix and carries its plan', async () => {
      await setup([], [task]);

      const result = await service.resolve('2e139d89');

      expect(result).toEqual([
        {
          id: TASK_ID,
          kind: ID_REF_KIND.TASK,
          planId: PLAN_ID,
          planTitle: 'Commander id lookup',
          status: 'PENDING',
          title: 'Server query',
        },
      ]);
      expect(tasks.findByIdPrefix).toHaveBeenCalledWith('2e139d89', 8);
    });

    it('lists plans before tasks when a prefix matches both', async () => {
      await setup([plan], [task]);

      const result = await service.resolve('e13908');

      expect(result.map((ref) => ref.kind)).toEqual([
        ID_REF_KIND.PLAN,
        ID_REF_KIND.TASK,
      ]);
    });

    it('caps the merged result at 8 refs', async () => {
      await setup(Array(6).fill(plan), Array(6).fill(task));

      const result = await service.resolve('abcdef');

      expect(result).toHaveLength(8);
    });
  });

  describe('full UUID', () => {
    it('matches a plan exactly instead of by prefix', async () => {
      await setup([plan], []);

      const result = await service.resolve(` ${PLAN_ID.toUpperCase()} `);

      expect(result[0]?.id).toBe(PLAN_ID);
      expect(plans.findBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PLAN_ID } }),
      );
      expect(plans.findByIdPrefix).not.toHaveBeenCalled();
    });

    it('matches a task exactly from its hyphen-less form', async () => {
      await setup([], [task]);

      const result = await service.resolve(TASK_ID.replace(/-/g, ''));

      expect(result[0]?.kind).toBe(ID_REF_KIND.TASK);
      expect(tasks.findBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TASK_ID } }),
      );
      expect(tasks.findByIdPrefix).not.toHaveBeenCalled();
    });
  });
});
