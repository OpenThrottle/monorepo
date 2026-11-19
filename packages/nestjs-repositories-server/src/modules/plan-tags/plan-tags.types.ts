import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { PlanTag } from './plan-tag.entity.ts';
import type { PlanTagsRepository } from './plan-tags.repository.ts';
import type { TagSource } from './tag-source/tag-source.types.ts';

/**
 * @description Scalar fields of a plan tag that GraphQL objects and DTOs mirror.
 * @public
 */
export interface PlanTagData {
  readonly confidence: number | null;
  readonly dimension: string;
  readonly id: string;
  readonly planId: string;
  readonly source: TagSource;
  readonly tag: string;
}

/**
 * @description A {@link PlanTagsRepository} mock: every inherited `BaseRepository` method plus
 * the plan-tag lookups.
 * @public
 */
export interface PlanTagsRepositoryMock extends BaseRepositoryMock<
  PlanTag,
  CreateModelInput<PlanTag>
> {
  readonly findByPlanAndDimension: Mock<
    PlanTagsRepository['findByPlanAndDimension']
  >;
  readonly findByPlanAndTag: Mock<PlanTagsRepository['findByPlanAndTag']>;
  readonly listByPlanId: Mock<PlanTagsRepository['listByPlanId']>;
}
