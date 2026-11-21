import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { And, In, IsNull, LessThan, MoreThanOrEqual } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Task } from '../tasks/task.entity.ts';
import { Plan } from './plan.entity.ts';
import { plansFactory } from './plans.factory.ts';
import { PlansRepository } from './plans.repository.ts';

describe('PlansRepository', () => {
  const softDelete = vi.fn();
  const findOneOrFail = vi.fn();
  const transaction = vi.fn();
  const query = vi.fn();
  const count = vi.fn();
  const find = vi.fn();
  const managerFind = vi.fn();
  const managerQuery = vi.fn();
  const managerUpdate = vi.fn();
  const queryBuilder = {
    addOrderBy: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn(),
    getManyAndCount: vi.fn(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    take: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  let repository: PlansRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    for (const method of [
      queryBuilder.addOrderBy,
      queryBuilder.andWhere,
      queryBuilder.limit,
      queryBuilder.orderBy,
      queryBuilder.select,
      queryBuilder.skip,
      queryBuilder.take,
      queryBuilder.where,
    ]) {
      method.mockReturnThis();
    }
    const manager = createMock<EntityManager>({
      find: managerFind,
      findOneOrFail,
      query: managerQuery,
      softDelete,
      update: managerUpdate,
    });
    transaction.mockImplementation(
      async (run: (entityManager: EntityManager) => Promise<unknown>) => {
        return run(manager);
      },
    );

    const app = await Test.createTestingModule({
      providers: [
        PlansRepository,
        {
          provide: getRepositoryToken(Plan),
          useValue: createMock<Repository<Plan>>({
            count,
            createQueryBuilder: vi.fn().mockReturnValue(queryBuilder),
            find,
            manager: createMock<EntityManager>({
              query: managerQuery,
              transaction,
            }),
            query,
            target: Plan,
          }),
        },
      ],
    }).compile();

    repository = app.get<PlansRepository>(PlansRepository);
  });

  describe('remove', () => {
    it('soft deletes the plan, then its live tasks, in one transaction', async () => {
      const deleted = plansFactory.build({
        deletedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      softDelete.mockResolvedValue({ affected: 1, raw: [] });
      findOneOrFail.mockResolvedValue(deleted);

      const result = await repository.remove(deleted.id);

      expect(result).toBe(deleted);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(softDelete.mock.calls).toEqual([
        [Plan, { deletedAt: IsNull(), id: deleted.id }],
        [Task, { deletedAt: IsNull(), planId: deleted.id }],
      ]);
      expect(findOneOrFail).toHaveBeenCalledWith(Plan, {
        where: { id: deleted.id },
        withDeleted: true,
      });
    });

    it('throws NotFoundException and leaves the tasks alone when no live plan has the id', async () => {
      softDelete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(repository.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(repository.remove('missing')).rejects.toThrow(
        'plans record with ID "missing" not found',
      );
      expect(softDelete).toHaveBeenCalledTimes(2);
      expect(softDelete.mock.calls.every(([entity]) => entity === Plan)).toBe(
        true,
      );
    });
  });

  describe('findByIdPrefix', () => {
    it('matches the hyphen-stripped id of live plans, newest first, up to the limit', async () => {
      const plans = plansFactory.buildList(2);
      queryBuilder.getMany.mockResolvedValue(plans);

      const result = await repository.findByIdPrefix('f5e40886', 5);

      expect(result).toBe(plans);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        `REPLACE(plan.id::text, '-', '') ILIKE :pattern`,
        { pattern: 'f5e40886%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'plan.deletedAt IS NULL',
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'plan.updatedAt',
        'DESC',
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });
  });

  describe('listFiltered', () => {
    const base = {
      assignees: [],
      orderColumn: 'createdAt',
      orderDirection: 'DESC',
      project: null,
      projectId: null,
      skip: 20,
      statuses: [],
      take: 10,
      titleSubstring: null,
    } as const;

    it('reads live plans only and applies no filter when none is given', async () => {
      const plans = plansFactory.buildList(1);
      queryBuilder.getManyAndCount.mockResolvedValue([plans, 41]);

      const result = await repository.listFiltered(base);

      expect(result).toEqual({ plans, totalCount: 41 });
      expect(queryBuilder.where).toHaveBeenCalledWith('plan.deletedAt IS NULL');
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'plan.createdAt',
        'DESC',
      );
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20);
    });

    it('binds each status and assignee as its own parameter', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.listFiltered({
        ...base,
        assignees: ['ada', 'bob'],
        statuses: ['PENDING', 'COMPLETED'],
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'plan.status IN (:status_0, :status_1)',
        { status_0: 'PENDING', status_1: 'COMPLETED' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        '(plan.author IN (:assignee_0, :assignee_1) OR plan.assignee IN (:assignee_0, :assignee_1))',
        { assignee_0: 'ada', assignee_1: 'bob' },
      );
    });

    it('narrows by project, project id and title substring', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await repository.listFiltered({
        ...base,
        project: 'monorepo',
        projectId: 'project-1',
        titleSubstring: 'fix',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'plan.project = :project',
        { project: 'monorepo' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'plan.projectId = :projectId',
        { projectId: 'project-1' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'plan.title ILIKE :titlePattern',
        { titlePattern: '%fix%' },
      );
    });
  });

  describe('facet queries', () => {
    it('countByStatus counts live plans only', async () => {
      query.mockResolvedValue([{ count: 3, status: 'PENDING' }]);

      const rows = await repository.countByStatus(500);

      expect(rows).toEqual([{ count: 3, status: 'PENDING' }]);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE deleted_at IS NULL GROUP BY status'),
        [500],
      );
    });

    it('listDistinctCategories reads live plans only and unwraps the column', async () => {
      query.mockResolvedValue([{ category: 'docs' }, { category: 'infra' }]);

      const categories = await repository.listDistinctCategories(500);

      expect(categories).toEqual(['docs', 'infra']);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('FROM plans WHERE deleted_at IS NULL'),
        [500],
      );
    });

    it('listDistinctPeople filters every table it reads on deleted_at', async () => {
      query.mockResolvedValue([{ person: 'ada' }]);

      const people = await repository.listDistinctPeople(500);

      expect(people).toEqual(['ada']);
      const sql = String(query.mock.calls[0]?.[0]);
      expect(sql).toContain('FROM plans WHERE deleted_at IS NULL)');
      expect(sql).toContain(
        'FROM plans WHERE deleted_at IS NULL AND assignee IS NOT NULL',
      );
      expect(sql).toContain(
        'FROM tasks WHERE deleted_at IS NULL AND assignee IS NOT NULL',
      );
    });
  });

  describe('findByRefPrefix', () => {
    it('matches the id as text over live plans, up to the limit', async () => {
      const plans = plansFactory.buildList(1);
      queryBuilder.getMany.mockResolvedValue(plans);

      const result = await repository.findByRefPrefix('f5e40886', 2);

      expect(result).toBe(plans);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'plan.id::text LIKE :prefix',
        { prefix: 'f5e40886%' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'plan.deletedAt IS NULL',
      );
      expect(queryBuilder.limit).toHaveBeenCalledWith(2);
    });
  });

  describe('countByDateRange', () => {
    it('counts live plans whose column falls in [dayStart, dayEnd)', async () => {
      const dayStart = new Date('2026-01-01T00:00:00.000Z');
      const dayEnd = new Date('2026-01-02T00:00:00.000Z');
      count.mockResolvedValue(4);

      const result = await repository.countByDateRange({
        column: 'createdAt',
        dayEnd,
        dayStart,
      });

      expect(result).toBe(4);
      expect(count).toHaveBeenCalledWith({
        where: { createdAt: And(MoreThanOrEqual(dayStart), LessThan(dayEnd)) },
      });
    });
  });

  describe('listInProject', () => {
    it('lists live plans of the project in project order', async () => {
      const plans = plansFactory.buildList(2);
      queryBuilder.getMany.mockResolvedValue(plans);

      const result = await repository.listInProject('project-1');

      expect(result).toBe(plans);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'plan.projectId = :projectId',
        { projectId: 'project-1' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'plan.projectSortOrder',
        'ASC',
        'NULLS LAST',
      );
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
        'plan.createdAt',
        'ASC',
      );
    });
  });

  describe('maxProjectSortOrders', () => {
    it('skips the query when no project is asked about', async () => {
      const result = await repository.maxProjectSortOrders([]);

      expect(result.size).toBe(0);
      expect(managerQuery).not.toHaveBeenCalled();
    });

    it('maps each project to its highest live position; a project with none has no entry', async () => {
      managerQuery.mockResolvedValue([{ max: 3000, project_id: 'a' }]);

      const result = await repository.maxProjectSortOrders(['a', 'b']);

      expect(result.get('a')).toBe(3000);
      expect(result.has('b')).toBe(false);
      expect(managerQuery.mock.calls[0]?.[0]).toMatch(/deleted_at IS NULL/);
      expect(managerQuery.mock.calls[0]?.[1]).toEqual([['a', 'b']]);
    });

    it('reads through the caller transaction manager when one is given', async () => {
      const transactionQuery = vi.fn().mockResolvedValue([]);
      const transactionManager = createMock<EntityManager>({
        query: transactionQuery,
      });

      await repository.maxProjectSortOrders(['a'], transactionManager);

      expect(transactionQuery).toHaveBeenCalledTimes(1);
      expect(managerQuery).not.toHaveBeenCalled();
    });
  });

  describe('renumberProjectPlans', () => {
    it('does nothing for an empty list', async () => {
      const result = await repository.renumberProjectPlans('project-1', []);

      expect(result).toEqual([]);
      expect(transaction).not.toHaveBeenCalled();
    });

    it('clears the positions first, then numbers 1000, 2000, … in the given order, in one transaction', async () => {
      const plans = plansFactory.buildList(3);
      managerUpdate.mockResolvedValue({ affected: 1 });
      managerFind.mockResolvedValue(plans);
      const ids = ['c', 'a', 'b'];

      const result = await repository.renumberProjectPlans('project-1', ids);

      expect(result).toBe(plans);
      expect(transaction).toHaveBeenCalledTimes(1);
      expect(managerUpdate.mock.calls[0]).toEqual([
        Plan,
        { id: In(ids), projectId: 'project-1' },
        { projectSortOrder: null },
      ]);
      expect(managerUpdate.mock.calls.slice(1)).toEqual([
        [Plan, { id: 'c', projectId: 'project-1' }, { projectSortOrder: 1000 }],
        [Plan, { id: 'a', projectId: 'project-1' }, { projectSortOrder: 2000 }],
        [Plan, { id: 'b', projectId: 'project-1' }, { projectSortOrder: 3000 }],
      ]);
    });
  });
});
