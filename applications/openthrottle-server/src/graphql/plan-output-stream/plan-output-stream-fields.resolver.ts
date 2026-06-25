/**
 * @description Request-scoped field resolver for PlanOutputStreamChunkObject. Holds
 * the per-request PlanOutputStreamLoaders DataLoader to resolve the `plan` relation
 * without N+1. Kept separate from PlanOutputStreamResolver because that resolver
 * registers a @Subscription(), which requires a singleton — injecting the
 * request-scoped loader there would promote it to request scope and break boot.
 */

import type { Plan } from '@openthrottle/nestjs-repositories';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { PlanObject } from '../plans/plan.object';
import { PlanOutputStreamChunkObject } from './plan-output-stream-chunk.object';
import { PlanOutputStreamLoaders } from './plan-output-stream-loaders';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => PlanOutputStreamChunkObject)
export class PlanOutputStreamFieldsResolver {
  constructor(private readonly loaders: PlanOutputStreamLoaders) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: PlanOutputStreamChunkObject,
  ): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }
}
