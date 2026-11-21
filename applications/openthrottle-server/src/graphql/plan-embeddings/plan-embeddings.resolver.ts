/**
 * @description Resolver for PlanEmbedding queries. Injects PlanEmbeddingsRepository from @openthrottle/nestjs-repositories-server and maps entities to PlanEmbeddingObject.
 */

import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { resolvePagination } from '@openthrottle/nestjs-postgres';
import type { PlanEmbedding } from '@openthrottle/nestjs-repositories-server';
import { PlanEmbeddingsRepository } from '@openthrottle/nestjs-repositories-server';

import { PlanObject } from '../plans/plan.object.ts';
import { PlanEmbeddingsLoaders } from './loaders/loaders.service.ts';
import {
  GetPlanEmbeddingInput,
  PlanEmbeddingsByPlanInput,
} from './plan-embedding.input.ts';
import { PlanEmbeddingObject } from './plan-embedding.object.ts';

/** Default and hard ceiling for the unbounded list query (bounds API memory). */
const DEFAULT_LIST_LIMIT = 1000;
const MAX_LIST_LIMIT = 1000;

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => PlanEmbeddingObject)
export class PlanEmbeddingsResolver {
  constructor(
    private readonly loaders: PlanEmbeddingsLoaders,
    private readonly planEmbeddingsRepository: PlanEmbeddingsRepository,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: PlanEmbeddingObject,
  ): Promise<PlanObject | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }

  @Query(() => PlanEmbeddingObject, {
    description: `Get a plan embedding by ID`,
    nullable: true,
  })
  async planEmbedding(
    @Args('input', { type: () => GetPlanEmbeddingInput })
    input: GetPlanEmbeddingInput,
  ): Promise<PlanEmbedding | null> {
    const entity = await this.planEmbeddingsRepository.findOne({
      where: { id: input.id },
    });

    return entity;
  }

  @Query(() => [PlanEmbeddingObject], {
    description: `List plan embeddings by plan ID, ordered by createdAt ascending`,
  })
  async planEmbeddings(
    @Args('input', { type: () => PlanEmbeddingsByPlanInput })
    input: PlanEmbeddingsByPlanInput,
  ): Promise<PlanEmbedding[]> {
    const { skip, take } = resolvePagination(input, {
      defaultLimit: DEFAULT_LIST_LIMIT,
      max: MAX_LIST_LIMIT,
    });

    const entities = await this.planEmbeddingsRepository.findBy({
      order: { createdAt: 'ASC' },
      skip,
      take,
      where: { planId: input.planId },
    });

    return entities;
  }
}
