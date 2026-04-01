/**
 * @description Resolver for PlanEmbedding queries. Injects PlanEmbeddingsService from @openthrottle/nestjs-repositories and maps entities to PlanEmbeddingObject.
 */

import type { PlanEmbedding } from '@openthrottle/nestjs-repositories';
import {
  PlanEmbeddingsService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import {
  GetPlanEmbeddingInput,
  PlanEmbeddingsByPlanInput,
} from './plan-embedding.input';
import { PlanEmbeddingObject } from './plan-embedding.object';

@Resolver(() => PlanEmbeddingObject)
export class PlanEmbeddingsResolver {
  constructor(
    private readonly planEmbeddingsService: PlanEmbeddingsService,
    private readonly plansService: PlansService,
  ) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: PlanEmbeddingObject,
  ): Promise<PlanObject | null> {
    if (!parent.planId) return null;

    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: parent.planId } });

    return plan;
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
    const entities = await this.planEmbeddingsService.getRepository().find({
      order: { createdAt: 'ASC' },
      where: { planId: input.planId },
    });

    return entities;
  }
}
