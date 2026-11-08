import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Plan, Task } from '@openthrottle/nestjs-repositories';

import { TaskObject } from '../../tasks/task.object.ts';
import { ActivityCommitRowObject } from '../activity.object.ts';
import { ActivityLoaders } from '../loaders/loaders.service.ts';

// @authz-stance: authenticated-only (Path A — see OT plan 18e16dfc-4f22-43f9-9b77-6fc90309b60a)
@Resolver(() => ActivityCommitRowObject)
export class ActivityCommitRowResolver {
  constructor(private readonly loaders: ActivityLoaders) {}

  @ResolveField(() => Plan, {
    description: `Resolved plan entity when planId is set`,
    nullable: true,
  })
  async plan(@Parent() parent: ActivityCommitRowObject): Promise<Plan | null> {
    if (!parent.planId) return null;

    return this.loaders.planLoader.load(parent.planId);
  }

  @ResolveField(() => TaskObject, {
    description: `Resolved task entity when taskId is set`,
    nullable: true,
  })
  async task(@Parent() parent: ActivityCommitRowObject): Promise<Task | null> {
    if (!parent.taskId) return null;

    return this.loaders.taskLoader.load(parent.taskId);
  }
}
