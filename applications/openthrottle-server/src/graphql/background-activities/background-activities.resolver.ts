/**
 * @description GraphQL resolver for background activities (OT plan 5767e798). Public, like
 * `serverHealth`, so the shell can show it beside System Status on every page; activity labels
 * carry nothing private.
 */

import { Query, Resolver } from '@nestjs/graphql';
import { Public } from '@openthrottle/nestjs-auth';

import { BackgroundActivityObject } from './background-activities.object.ts';
import { BackgroundActivitiesService } from './background-activities.service.ts';

@Public()
@Resolver(() => BackgroundActivityObject)
export class BackgroundActivitiesResolver {
  constructor(
    private readonly backgroundActivitiesService: BackgroundActivitiesService,
  ) {}

  @Query(() => [BackgroundActivityObject], {
    description: `Long-running server work in progress, oldest first; empty when the server is idle. Served from Redis without counting database rows, so it is cheap to poll.`,
  })
  backgroundActivities(): Promise<BackgroundActivityObject[]> {
    return this.backgroundActivitiesService.findAll();
  }
}
