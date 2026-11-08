import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plan, Task } from '@openthrottle/nestjs-repositories';

import { PlanObject } from '../../plans/plan.object.ts';
import { TaskObject } from '../../tasks/task.object.ts';
import { ActivityTaskUpdatedRowObject } from '../activity.object.ts';
import { ActivityLoaders } from '../loaders/loaders.service.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)

@Resolver(() => ActivityTaskUpdatedRowObject)
export class ActivityTaskUpdatedRowResolver {
  constructor(private readonly loaders: ActivityLoaders) {}

  @ResolveField(() => PlanObject, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(
    @Parent() parent: ActivityTaskUpdatedRowObject,
  ): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity (row id is the task id)`,
    nullable: true,
  })
  async task(
    @Parent() parent: ActivityTaskUpdatedRowObject,
  ): Promise<Task | null> {
    if (!parent.id) return null;

    return this.loaders.taskLoader.load(parent.id);
  }
}
