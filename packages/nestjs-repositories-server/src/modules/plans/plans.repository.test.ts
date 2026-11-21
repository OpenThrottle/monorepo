import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  appendSortOrder,
  moveInScope,
  reorderInScope,
} from '@openthrottle/nestjs-postgres';
import { createQueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import type { EntityManager, Repository } from 'typeorm';
import { And, In, IsNull, LessThan, MoreThanOrEqual } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Task } from '../tasks/task.entity.ts';
import { Plan } from './plan.entity.ts';
import { PLANS_PROJECT_SORT_ORDER_SCOPE } from './plans.constants.ts';
import { plansFactory } from './plans.factory.ts';
import { PlansRepository } from './plans.repository.ts';

vi.mock('@openthrottle/nestjs-postgres', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();

  return {
    ...actual,
    appendSortOrder: vi.fn(),
    moveInScope: vi.fn(),
    reorderInScope: vi.fn(),
  };
});

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
  const queryBuilder = createQueryBuilderMock<Plan>();
  let repository: PlansRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
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

  describe('loadRepositoryIds', () => {
    it('writes the stored repositoryId onto each plan with one query', async () => {
      const linked = plansFactory.build({ repositoryId: null });
      const unlinked = plansFactory.build({ repositoryId: null });
      const repositoryId = '33333333-3333-4333-8333-333333333333';
      find.mockResolvedValue([
        { id: linked.id, repositoryId },
        { id: unlinked.id, repositoryId: null },
      ]);

      const result = await repository.loadRepositoryIds([linked, unlinked]);

      expect(find).toHaveBeenCalledTimes(1);
      expect(find).toHaveBeenCalledWith({
        select: { id: true, repositoryId: true },
        where: { id: In([linked.id, unlinked.id]) },
        withDeleted: true,
      });
      expect(result.map((plan) => plan.repositoryId)).toEqual([
        repositoryId,
        null,
      ]);
    });

    it('skips the query for an empty batch', async () => {
      await expect(repository.loadRepositoryIds([])).resolves.toEqual([]);
      expect(find).not.toHaveBeenCalled();
    });
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
      pagination: { limit: 10, offset: 20 },
      project: null,
      projectId: null,
      statuses: [],
      titleSubstring: null,
    } as const;

    it('reads live plans only and applies no filter when none is given', async () => {
      const plans = plansFactory.buildList(1);
      queryBuilder.getManyAndCount.mockResolvedValue([plans, 41]);

      const result = await repository.listFiltered(base);

      expect(result).toEqual({ items: plans, totalCount: 41 });
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

  describe('pageInProject', () => {
    it('reads one window of the project order with the total count', async () => {
      const plans = plansFactory.buildList(2);
      queryBuilder.getManyAndCount.mockResolvedValue([plans, 94]);

      const result = await repository.pageInProject('project-1', {
        limit: 50,
        offset: 50,
      });

      expect(result).toEqual({ items: plans, totalCount: 94 });
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'plan.projectId = :projectId',
        { projectId: 'project-1' },
      );
      expect(queryBuilder.orderBy).toHaveBeenCalledWith(
        'plan.projectSortOrder',
        'ASC',
        'NULLS LAST',
      );
      expect(queryBuilder.skip).toHaveBeenCalledWith(50);
      expect(queryBuilder.take).toHaveBeenCalledWith(50);
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

  describe('project ordering', () => {
    it('appends through the shared helper, joining a given manager', async () => {
      const manager = createMock<EntityManager>();
      vi.mocked(appendSortOrder).mockResolvedValue(4000);

      await expect(
        repository.appendProjectSortOrder('project-1', manager),
      ).resolves.toBe(4000);
      expect(appendSortOrder).toHaveBeenCalledWith(
        manager,
        PLANS_PROJECT_SORT_ORDER_SCOPE,
        'project-1',
      );
    });

    it('reorders and moves through the shared helpers', async () => {
      vi.mocked(reorderInScope).mockResolvedValue({
        assignments: [],
        kind: 'reordered',
      });
      vi.mocked(moveInScope).mockResolvedValue({
        kind: 'at-edge',
        scopeId: 'project-1',
      });

      await expect(
        repository.reorderInProject('project-1', ['a', 'b']),
      ).resolves.toEqual({ assignments: [], kind: 'reordered' });
      await expect(repository.moveInProject('a', 'UP')).resolves.toEqual({
        kind: 'at-edge',
        scopeId: 'project-1',
      });
      expect(reorderInScope).toHaveBeenCalledWith(
        expect.anything(),
        PLANS_PROJECT_SORT_ORDER_SCOPE,
        'project-1',
        ['a', 'b'],
      );
      expect(moveInScope).toHaveBeenCalledWith(
        expect.anything(),
        PLANS_PROJECT_SORT_ORDER_SCOPE,
        'a',
        'UP',
      );
    });
  });
  describe('listRecentForAuthor', () => {
    it('loads the authors plans newest updated first, capped', async () => {
      const plans = plansFactory.buildList(2);
      find.mockResolvedValue(plans);

      await expect(repository.listRecentForAuthor('octocat', 5)).resolves.toBe(
        plans,
      );
      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { updatedAt: 'DESC' },
          take: 5,
          where: { author: 'octocat' },
        }),
      );
    });
  });
});
