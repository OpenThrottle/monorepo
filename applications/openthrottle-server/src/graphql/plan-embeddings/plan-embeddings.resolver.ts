/**
 * @description Resolver for PlanEmbedding queries. Injects PlanEmbeddingsService from @openthrottle/nestjs-repositories and maps entities to PlanEmbeddingObject.
 */

import type { PlanEmbedding } from '@openthrottle/nestjs-repositories';
import { PlanEmbeddingsService } from '@openthrottle/nestjs-repositories';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import {
  GetPlanEmbeddingInput,
  PlanEmbeddingsByPlanInput,
} from './plan-embedding.input';
import { PlanEmbeddingObject } from './plan-embedding.object';
import { PlanEmbeddingsLoaders } from './plan-embeddings-loaders';

/** Default and hard ceiling for the unbounded list query (bounds API memory). */
const DEFAULT_LIST_LIMIT = 1000;
const MAX_LIST_LIMIT = 1000;

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => PlanEmbeddingObject)
export class PlanEmbeddingsResolver {
  constructor(
    private readonly loaders: PlanEmbeddingsLoaders,
    private readonly planEmbeddingsService: PlanEmbeddingsService,
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
    const entity = await this.planEmbeddingsService
      .getRepository()
      .findOne({ where: { id: input.id } });

    return entity;
  }

  @Query(() => [PlanEmbeddingObject], {
    description: `List plan embeddings by plan ID, ordered by createdAt ascending`,
  })
  async planEmbeddings(
    @Args('input', { type: () => PlanEmbeddingsByPlanInput })
    input: PlanEmbeddingsByPlanInput,
  ): Promise<PlanEmbedding[]> {
    const take = Math.min(
      Math.max(1, input.limit ?? DEFAULT_LIST_LIMIT),
      MAX_LIST_LIMIT,
    );
    const skip = Math.max(0, input.offset ?? 0);

    const entities = await this.planEmbeddingsService.getRepository().find({
      order: { createdAt: 'ASC' },
      skip,
      take,
      where: { planId: input.planId },
    });

    return entities;
  }
}
