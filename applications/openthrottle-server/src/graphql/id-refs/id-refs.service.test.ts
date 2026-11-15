/**
 * @description Unit tests for IdRefsService: prefix vs exact matching, the
 * plans-first merge, and the junk-input short circuit.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import type { Plan, Task } from '@openthrottle/nestjs-repositories';
import { PlansService, TasksService } from '@openthrottle/nestjs-repositories';
import type { SelectQueryBuilder } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ID_REF_KIND } from './id-refs.enum.ts';
import { IdRefsService } from './id-refs.service.ts';

const PLAN_ID = '1e5089b4-94f1-449b-8d80-4edd82c47037';
const TASK_ID = '2e139d89-3dde-42f1-a51a-6899ef4e1e86';

const createQbMock = <TEntity extends object>(rows: TEntity[]) => {
  const getMany = vi.fn().mockResolvedValue(rows);
  const leftJoin = vi.fn().mockReturnThis();
  const limit = vi.fn().mockReturnThis();
  const orderBy = vi.fn().mockReturnThis();
  const select = vi.fn().mockReturnThis();
  const take = vi.fn().mockReturnThis();
  const where = vi.fn().mockReturnThis();
  const chain = createMock<SelectQueryBuilder<TEntity>>({
    getMany,
    leftJoin,
    limit,
    orderBy,
    select,
    take,
    where,
  });

  return { chain, limit, take, where };
};

const plan = createMock<Plan>({
  id: PLAN_ID,
  status: 'IN_PROGRESS',
  title: 'Commander id lookup',
});

const task = createMock<Task>({
  id: TASK_ID,
  plan: createMock<Plan>({ id: PLAN_ID, title: 'Commander id lookup' }),
  planId: PLAN_ID,
  status: 'PENDING',
  title: 'Server query',
});

describe('IdRefsService', () => {
  let service: IdRefsService;
  let planQb: ReturnType<typeof createQbMock<Plan>>;
  let taskQb: ReturnType<typeof createQbMock<Task>>;
  let plansCreateQb: ReturnType<typeof vi.fn>;
  let tasksCreateQb: ReturnType<typeof vi.fn>;

  const setup = async (plans: Plan[], tasks: Task[]): Promise<void> => {
    planQb = createQbMock(plans);
    taskQb = createQbMock(tasks);
    plansCreateQb = vi.fn().mockReturnValue(planQb.chain);
    tasksCreateQb = vi.fn().mockReturnValue(taskQb.chain);

    const moduleRef = await Test.createTestingModule({
      providers: [
        IdRefsService,
        {
          provide: PlansService,
          useValue: {
            getRepository: () => {
              return { createQueryBuilder: plansCreateQb };
            },
          },
        },
        {
          provide: TasksService,
          useValue: {
            getRepository: () => {
              return { createQueryBuilder: tasksCreateQb };
            },
          },
        },
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
      expect(plansCreateQb).not.toHaveBeenCalled();
      expect(tasksCreateQb).not.toHaveBeenCalled();
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
      expect(planQb.where).toHaveBeenCalledWith(expect.any(String), {
        pattern: '1e5089b4%',
      });
      expect(planQb.take).toHaveBeenCalledWith(8);
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
      expect(taskQb.where).toHaveBeenCalledWith(expect.any(String), {
        pattern: '2e139d89%',
      });
      // A joined query must use LIMIT: `take` would wrap it in a DISTINCT
      // subquery that fails to order by task.updatedAt in Postgres.
      expect(taskQb.limit).toHaveBeenCalledWith(8);
      expect(taskQb.take).not.toHaveBeenCalled();
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
      expect(planQb.where).toHaveBeenCalledWith('plan.id = :id', {
        id: PLAN_ID,
      });
      expect(planQb.take).not.toHaveBeenCalled();
    });

    it('matches a task exactly from its hyphen-less form', async () => {
      await setup([], [task]);

      const result = await service.resolve(TASK_ID.replace(/-/g, ''));

      expect(result[0]?.kind).toBe(ID_REF_KIND.TASK);
      expect(taskQb.where).toHaveBeenCalledWith('task.id = :id', {
        id: TASK_ID,
      });
    });
  });
});
