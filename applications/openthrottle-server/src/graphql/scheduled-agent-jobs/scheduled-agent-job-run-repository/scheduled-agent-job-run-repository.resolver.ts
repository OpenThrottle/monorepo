import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { GqlPermissionsGuard } from '../../../guards/gql-permissions.guard.ts';
import { ScheduledAgentJobsLoaders } from '../loaders/loaders.service.ts';
import {
  ScheduledAgentJobObject,
  ScheduledAgentJobRepositoryObject,
  ScheduledAgentJobRunObject,
} from '../scheduled-agent-job.object.ts';
import { toScheduledAgentJobObject } from '../scheduled-agent-jobs.mapper.ts';
import { resolveTargetRepository } from '../scheduled-agent-jobs.utils.ts';

/**
 * @description Resolves the display fields for the checkout a RUN targeted. Separate resolver because
 * `@ResolveField` is bound to the parent ObjectType.
 */
@Resolver(() => ScheduledAgentJobRunObject)
@UseGuards(GqlPermissionsGuard)
export class ScheduledAgentJobRunRepositoryResolver {
  constructor(private readonly loaders: ScheduledAgentJobsLoaders) {}

  @ResolveField(() => ScheduledAgentJobObject, {
    description: `The schedule this run belongs to, so a cross-job run list can label itself without a second round trip. Null only if the schedule has since been deleted.`,
    nullable: true,
  })
  async job(
    @Parent() parent: ScheduledAgentJobRunObject,
  ): Promise<ScheduledAgentJobObject | null> {
    const job = await this.loaders.jobLoader.load(parent.scheduledAgentJobId);
    return job === null ? null : toScheduledAgentJobObject(job);
  }

  @ResolveField(() => ScheduledAgentJobRepositoryObject, {
    description: `The repository checkout this run targeted at fire time, resolved for display.`,
    nullable: true,
  })
  async repository(
    @Parent() parent: ScheduledAgentJobRunObject,
  ): Promise<ScheduledAgentJobRepositoryObject | null> {
    return resolveTargetRepository(this.loaders, parent.repositoryCheckoutId);
  }
}
