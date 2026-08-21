/**
 * @description Request-scoped DataLoaders for the scheduled-agent-jobs resolvers (repository checkout
 * by id, schedule by id). One instance per GraphQL request, so labelling the target across a whole
 * schedule list — or a page of runs — batches into a single query instead of one findById per row.
 */

import { Injectable, Scope } from '@nestjs/common';
import {
  createEntityByIdLoader,
  RepositoryCheckoutsService,
  ScheduledAgentJobsService,
  type RepositoryCheckout,
  type ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories';
import type DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class ScheduledAgentJobsLoaders {
  readonly checkoutLoader: DataLoader<string, RepositoryCheckout | null>;

  /** Schedules by id — labels a page of runs with their owning schedule in one query. */
  readonly jobLoader: DataLoader<string, ScheduledAgentJob | null>;

  constructor(
    checkoutsService: RepositoryCheckoutsService,
    jobsService: ScheduledAgentJobsService,
  ) {
    this.checkoutLoader = createEntityByIdLoader(checkoutsService);
    // ScheduledAgentJobsService fronts two repositories, so adapt the jobs one to the accessor shape.
    this.jobLoader = createEntityByIdLoader({
      getRepository: () => jobsService.getJobRepository(),
    });
  }
}
