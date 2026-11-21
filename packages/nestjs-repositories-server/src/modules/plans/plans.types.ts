import type {
  CreateModelInput,
  PaginationInput,
} from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { Plan } from './plan.entity.ts';
import type { PlansRepository } from './plans.repository.ts';

/**
 * Scalar/column fields of Plan (no relations, no `deletedAt`). Use this to type GraphQL
 * objects or DTOs that mirror the entity.
 * @public
 */
export type PlanData = Pick<
  Plan,
  | 'assignee'
  | 'author'
  | 'category'
  | 'completedAt'
  | 'createdAt'
  | 'description'
  | 'id'
  | 'project'
  | 'projectId'
  | 'status'
  | 'summary'
  | 'title'
  | 'updatedAt'
>;

type PlanRelationKeys =
  'planEmbeddings' | 'planOutputChunks' | 'projectRelation' | 'tasks';

type PlanDefaultedKeys =
  | 'assignee'
  | 'completedAt'
  | 'description'
  | 'jobRunHooks'
  | 'project'
  | 'projectId'
  | 'projectSortOrder'
  | 'runConfig'
  | 'status'
  | 'summary';

/**
 * @description What `PlansRepository.create` takes: the plan's columns, with the relations left
 * out, the nullable and database-defaulted columns optional, and `id` for a caller that
 * supplies its own (an idempotent create).
 * @public
 */
export interface PlanCreateInput
  extends
    Omit<CreateModelInput<Plan>, PlanDefaultedKeys | PlanRelationKeys>,
    Partial<Pick<CreateModelInput<Plan>, PlanDefaultedKeys>> {
  readonly id?: string;
}

/**
 * @description Input for {@link PlansRepository.countByDateRange}: counts live plans whose
 * `column` falls in `[dayStart, dayEnd)`.
 * @public
 */
export interface CountPlansByDateRangeParams {
  readonly column: 'completedAt' | 'createdAt' | 'updatedAt';
  readonly dayEnd: Date;
  readonly dayStart: Date;
}

/**
 * @description Filters and paging for {@link PlansRepository.listFiltered}. An empty `statuses`
 * or `assignees` list applies no filter; `assignees` matches a plan's author or assignee.
 * @public
 */
export interface ListPlansFilteredParams {
  readonly assignees: readonly string[];
  readonly orderColumn: 'createdAt' | 'updatedAt';
  readonly orderDirection: 'ASC' | 'DESC';
  readonly pagination: PaginationInput;
  readonly project: string | null;
  readonly projectId: string | null;
  readonly statuses: readonly string[];
  readonly titleSubstring: string | null;
}

/**
 * @description A row of {@link PlansRepository.countByStatus}.
 * @public
 */
export interface PlanStatusCountRow {
  readonly count: number;
  readonly status: string;
}

/**
 * @description A {@link PlansRepository} mock: every inherited `BaseRepository` method plus the
 * plan ones (`remove` cascades to tasks in the real repository).
 * @public
 */
export interface PlansRepositoryMock extends BaseRepositoryMock<
  Plan,
  PlanCreateInput
> {
  readonly appendProjectSortOrder: Mock<
    PlansRepository['appendProjectSortOrder']
  >;
  readonly countByDateRange: Mock<PlansRepository['countByDateRange']>;
  readonly countByStatus: Mock<PlansRepository['countByStatus']>;
  readonly findByIdPrefix: Mock<PlansRepository['findByIdPrefix']>;
  readonly findByRefPrefix: Mock<PlansRepository['findByRefPrefix']>;
  readonly listDistinctCategories: Mock<
    PlansRepository['listDistinctCategories']
  >;
  readonly listDistinctPeople: Mock<PlansRepository['listDistinctPeople']>;
  readonly listFiltered: Mock<PlansRepository['listFiltered']>;
  readonly listInProject: Mock<PlansRepository['listInProject']>;
  readonly maxProjectSortOrders: Mock<PlansRepository['maxProjectSortOrders']>;
  readonly moveInProject: Mock<PlansRepository['moveInProject']>;
  readonly pageInProject: Mock<PlansRepository['pageInProject']>;
  readonly reorderInProject: Mock<PlansRepository['reorderInProject']>;
}
