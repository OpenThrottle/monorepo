import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseRepository } from '@openthrottle/nestjs-postgres';
import type { EntityManager } from 'typeorm';
import {
  And,
  In,
  IsNull,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';

import { Task } from '../tasks/task.entity.ts';
import { Plan } from './plan.entity.ts';
import { PROJECT_PLAN_SORT_ORDER_GAP } from './plans.constants.ts';
import type {
  CountPlansByDateRangeParams,
  ListPlansFilteredParams,
  ListPlansFilteredResult,
  PlanCreateInput,
  PlanStatusCountRow,
} from './plans.types.ts';

/**
 * @description Data access for the openthrottle `plans` table on the default connection: the
 * `BaseRepository` CRUD, with `remove` cascading to the plan's tasks. A delete is a soft
 * delete, which fires none of the foreign key actions; see migration 173.
 * @public
 */
@Injectable()
export class PlansRepository extends BaseRepository<Plan, PlanCreateInput> {
  protected readonly tableName = 'plans';

  constructor(
    @InjectRepository(Plan)
    repository: Repository<Plan>,
  ) {
    super(repository);
  }

  /**
   * @description Soft deletes a live plan and every live task of that plan in one
   * transaction, then returns the deleted plan. Tasks have list paths of their own (by
   * category, by status, semantic search) that would otherwise surface orphans. The plan's
   * runs, output, embeddings, tags and messages stay in place, reachable only through the
   * deleted plan.
   * @throws NotFoundException when no live plan has that id (including already deleted).
   */
  override async remove(id: string): Promise<Plan> {
    return this.repository.manager.transaction(async (manager) => {
      const result = await manager.softDelete(Plan, {
        deletedAt: IsNull(),
        id,
      });
      if (!result.affected) {
        throw new NotFoundException(
          `${this.tableName} record with ID "${id}" not found`,
        );
      }
      await manager.softDelete(Task, { deletedAt: IsNull(), planId: id });
      return manager.findOneOrFail(Plan, { where: { id }, withDeleted: true });
    });
  }

  /**
   * @description Live plans whose id starts with `prefix`, compared against the hyphen-stripped
   * id so a fragment that spans a UUID hyphen still matches. Newest first, capped at `limit`,
   * and only `id`, `status` and `title` are loaded. `prefix` must already be validated hex: it
   * is bound as a parameter but carries no LIKE escaping.
   */
  async findByIdPrefix(prefix: string, limit: number): Promise<Plan[]> {
    return this.repository
      .createQueryBuilder('plan')
      .select(['plan.id', 'plan.status', 'plan.title'])
      .where(`REPLACE(plan.id::text, '-', '') ILIKE :pattern`, {
        pattern: `${prefix}%`,
      })
      .andWhere('plan.deletedAt IS NULL')
      .orderBy('plan.updatedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * @description One page of live plans for the status, assignee, project and title filters,
   * sorted by `orderColumn`, with the unpaged total. Loads the list-row columns only (no
   * description, run config or hooks).
   */
  async listFiltered(
    params: ListPlansFilteredParams,
  ): Promise<ListPlansFilteredResult> {
    const qb = this.repository
      .createQueryBuilder('plan')
      .select([
        'plan.assignee',
        'plan.author',
        'plan.category',
        'plan.createdAt',
        'plan.id',
        'plan.project',
        'plan.projectId',
        'plan.projectSortOrder',
        'plan.status',
        'plan.summary',
        'plan.title',
        'plan.updatedAt',
      ])
      .where('plan.deletedAt IS NULL')
      .orderBy(`plan.${params.orderColumn}`, params.orderDirection)
      .take(params.take)
      .skip(params.skip);

    // Explicit param names (status_0, status_1) instead of :...statuses so TypeORM binds arrays correctly.
    if (params.statuses.length > 0) {
      const statusParams = params.statuses.map((_, index) => {
        return `status_${index}`;
      });

      qb.andWhere(
        `plan.status IN (${statusParams
          .map((name) => {
            return `:${name}`;
          })
          .join(', ')})`,
        Object.fromEntries(
          params.statuses.map((status, index) => {
            return [`status_${index}`, status];
          }),
        ),
      );
    }

    if (params.assignees.length > 0) {
      const assigneeParams = params.assignees.map((_, index) => {
        return `assignee_${index}`;
      });
      const placeholders = assigneeParams
        .map((name) => {
          return `:${name}`;
        })
        .join(', ');

      qb.andWhere(
        `(plan.author IN (${placeholders}) OR plan.assignee IN (${placeholders}))`,
        Object.fromEntries(
          params.assignees.map((assignee, index) => {
            return [`assignee_${index}`, assignee];
          }),
        ),
      );
    }

    if (params.project !== null) {
      qb.andWhere('plan.project = :project', { project: params.project });
    }

    if (params.projectId !== null) {
      qb.andWhere('plan.projectId = :projectId', {
        projectId: params.projectId,
      });
    }

    if (params.titleSubstring !== null) {
      qb.andWhere('plan.title ILIKE :titlePattern', {
        titlePattern: `%${params.titleSubstring}%`,
      });
    }

    const [plans, totalCount] = await qb.getManyAndCount();

    return { plans, totalCount };
  }

  /**
   * @description Live plan count per status, ordered by status, for the sidebar filters. At
   * most `limit` rows.
   */
  async countByStatus(limit: number): Promise<PlanStatusCountRow[]> {
    return this.repository.query<PlanStatusCountRow[]>(
      `SELECT status, COUNT(*)::int AS count FROM plans WHERE deleted_at IS NULL GROUP BY status ORDER BY status LIMIT $1`,
      [limit],
    );
  }

  /**
   * @description Distinct categories of live plans, alphabetical, at most `limit`.
   */
  async listDistinctCategories(limit: number): Promise<string[]> {
    const rows = await this.repository.query<{ category: string }[]>(
      `SELECT DISTINCT category FROM plans WHERE deleted_at IS NULL ORDER BY category LIMIT $1`,
      [limit],
    );

    return rows.map((row) => {
      return row.category;
    });
  }

  /**
   * @description Distinct authors and assignees across live plans and live tasks, alphabetical,
   * at most `limit`.
   */
  async listDistinctPeople(limit: number): Promise<string[]> {
    const rows = await this.repository.query<{ person: string }[]>(
      `(SELECT author AS person FROM plans WHERE deleted_at IS NULL)
       UNION
       (SELECT assignee AS person FROM plans WHERE deleted_at IS NULL AND assignee IS NOT NULL)
       UNION
       (SELECT assignee AS person FROM tasks WHERE deleted_at IS NULL AND assignee IS NOT NULL)
       ORDER BY person
       LIMIT $1`,
      [limit],
    );

    return rows.map((row) => {
      return row.person;
    });
  }

  /**
   * @description How many live plans have `column` inside `[dayStart, dayEnd)`, for the daily
   * stats aggregate. `completedAt` is the immutable completion stamp, so a completion lands on
   * the day it happened rather than on the last day the row was touched.
   */
  async countByDateRange(params: CountPlansByDateRangeParams): Promise<number> {
    return this.repository.count({
      where: {
        [params.column]: And(
          MoreThanOrEqual(params.dayStart),
          LessThan(params.dayEnd),
        ),
      },
    });
  }

  /**
   * @description Up to `limit` live plans whose id, as text, starts with `prefix`, for resolving
   * a full uuid or a short-id reference from a commit trailer. Unordered, and only the id is
   * guaranteed; ask for two to tell an ambiguous prefix from a unique one. `prefix` is bound as
   * a parameter but carries no LIKE escaping.
   */
  async findByRefPrefix(prefix: string, limit: number): Promise<Plan[]> {
    return this.repository
      .createQueryBuilder('plan')
      .where('plan.id::text LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('plan.deletedAt IS NULL')
      .limit(limit)
      .getMany();
  }

  /**
   * @description The live plans of a project in their project order: `project_sort_order`
   * ascending, then creation time as a tie-break for any row that has no position yet.
   * Uses an explicit `orderBy` chain rather than a `find({ order })` object: the object's key
   * order is the sort precedence, and the alphabetize-keys lint rule would put `createdAt` first.
   */
  async listInProject(projectId: string): Promise<Plan[]> {
    return this.repository
      .createQueryBuilder('plan')
      .where('plan.projectId = :projectId', { projectId })
      .orderBy('plan.projectSortOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('plan.createdAt', 'ASC')
      .getMany();
  }

  /**
   * @description The highest live `project_sort_order` of each given project, keyed by project
   * id. A project with no positioned live plan has no entry. Pass `manager` to read inside a
   * transaction.
   */
  async maxProjectSortOrders(
    projectIds: readonly string[],
    manager?: EntityManager,
  ): Promise<Map<string, number>> {
    if (projectIds.length === 0) {
      return new Map();
    }

    const rows = await (manager ?? this.repository.manager).query<
      { max: number; project_id: string }[]
    >(
      `SELECT project_id, MAX(project_sort_order)::int AS max FROM plans WHERE deleted_at IS NULL AND project_sort_order IS NOT NULL AND project_id = ANY($1::uuid[]) GROUP BY project_id`,
      [projectIds],
    );

    return new Map(
      rows.map((row) => {
        return [row.project_id, row.max];
      }),
    );
  }

  /**
   * @description Renumbers the given plans 1000, 2000, … in `orderedPlanIds` order in one
   * transaction and returns them in that order. The positions are cleared first so the
   * per-project partial unique index never sees two plans on one slot mid-update. Callers
   * validate that every id is a live plan of `projectId`.
   */
  async renumberProjectPlans(
    projectId: string,
    orderedPlanIds: readonly string[],
  ): Promise<Plan[]> {
    if (orderedPlanIds.length === 0) {
      return [];
    }

    return this.repository.manager.transaction(async (manager) => {
      await manager.update(
        Plan,
        { id: In([...orderedPlanIds]), projectId },
        { projectSortOrder: null },
      );
      await Promise.all(
        orderedPlanIds.map((id, index) => {
          return manager.update(
            Plan,
            { id, projectId },
            {
              projectSortOrder: (index + 1) * PROJECT_PLAN_SORT_ORDER_GAP,
            },
          );
        }),
      );

      return manager.find(Plan, {
        order: { projectSortOrder: 'ASC' },
        where: { id: In([...orderedPlanIds]) },
      });
    });
  }
}
