import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plan } from '@openthrottle/nestjs-repositories';

import { PlanObject } from '../../plans/plan.object.ts';
import { ActivityOutputChunkRowObject } from '../activity.object.ts';
import { ActivityLoaders } from '../loaders/loaders.service.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)

@Resolver(() => ActivityOutputChunkRowObject)
export class ActivityOutputChunkRowResolver {
  constructor(private readonly loaders: ActivityLoaders) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: ActivityOutputChunkRowObject,
  ): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }
}
