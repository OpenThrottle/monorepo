import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { PlanTag } from './plan-tag.entity.ts';
import type { PlanTagsRepositoryMock } from './plan-tags.types.ts';

/**
 * @description Builds a {@link PlanTagsRepositoryMock} that starts as an empty `plan_tags` table
 * (see `createBaseRepositoryMock`): no lookup finds a row and `listByPlanId` returns nothing.
 * Provide it in place of `PlanTagsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createPlanTagsRepositoryMock(): PlanTagsRepositoryMock {
  return {
    ...createBaseRepositoryMock<PlanTag, CreateModelInput<PlanTag>>(
      'plan_tags',
    ),
    findByPlanAndDimension: vi.fn(async () => {
      return null;
    }),
    findByPlanAndTag: vi.fn(async () => {
      return null;
    }),
    listByPlanId: vi.fn(async () => {
      return [];
    }),
    listEffectiveTagNamesForPlans: vi.fn(async () => {
      return [];
    }),
  };
}
