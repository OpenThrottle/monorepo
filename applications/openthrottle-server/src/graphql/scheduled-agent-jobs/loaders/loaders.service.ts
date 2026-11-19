/**
 * @description Request-scoped DataLoaders for the scheduled-agent-jobs resolvers (repository checkout
 * by id, schedule by id). One instance per GraphQL request, so labelling the target across a whole
 * schedule list — or a page of runs — batches into a single query instead of one findById per row.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createEntityByIdLoader } from '@openthrottle/nestjs-postgres';
import type {
  RepositoryCheckout,
  ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories-server';
import {
  RepositoryCheckoutsRepository,
  ScheduledAgentJobsRepository,
} from '@openthrottle/nestjs-repositories-server';
import type DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class ScheduledAgentJobsLoaders {
  readonly checkoutLoader: DataLoader<string, RepositoryCheckout | null>;

  /** Schedules by id — labels a page of runs with their owning schedule in one query. */
  readonly jobLoader: DataLoader<string, ScheduledAgentJob | null>;

  constructor(
    checkoutsRepository: RepositoryCheckoutsRepository,
    jobsRepository: ScheduledAgentJobsRepository,
  ) {
    this.checkoutLoader = createEntityByIdLoader(checkoutsRepository);
    this.jobLoader = createEntityByIdLoader(jobsRepository);
  }
}
