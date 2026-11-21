import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { Plan } from './plan.entity.ts';
import type { PlanCreateInput, PlansRepositoryMock } from './plans.types.ts';

/**
 * @description Builds a {@link PlansRepositoryMock} that starts as an empty `plans` table
 * (see `createBaseRepositoryMock`): no counts, no distinct values, no matches. Provide it in place of `PlansRepository` and stub per
 * test. Test-only: imports `vitest`.
 * @public
 */
export function createPlansRepositoryMock(): PlansRepositoryMock {
  return {
    ...createBaseRepositoryMock<Plan, PlanCreateInput>('plans'),
    countByDateRange: vi.fn(async () => {
      return 0;
    }),
    countByStatus: vi.fn(async () => {
      return [];
    }),
    findByIdPrefix: vi.fn(async () => {
      return [];
    }),
    findByRefPrefix: vi.fn(async () => {
      return [];
    }),
    listDistinctCategories: vi.fn(async () => {
      return [];
    }),
    listDistinctPeople: vi.fn(async () => {
      return [];
    }),
    listFiltered: vi.fn(async () => {
      return { plans: [], totalCount: 0 };
    }),
    listInProject: vi.fn(async () => {
      return [];
    }),
    maxProjectSortOrders: vi.fn(async () => {
      return new Map<string, number>();
    }),
    pageInProject: vi.fn(async () => {
      return { plans: [], totalCount: 0 };
    }),
    renumberProjectPlans: vi.fn(async () => {
      return [];
    }),
  };
}
