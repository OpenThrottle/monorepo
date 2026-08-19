/**
 * @description Request-scoped DataLoader for the scheduled-agent-jobs resolvers (repository checkout
 * by id). One instance per GraphQL request, so labelling the target across a whole schedule list — or
 * a page of runs — batches into a single query instead of one findById per row.
 */

import { Injectable, Scope } from '@nestjs/common';
import {
  createEntityByIdLoader,
  RepositoryCheckoutsService,
  type RepositoryCheckout,
} from '@openthrottle/nestjs-repositories';
import type DataLoader from 'dataloader';

@Injectable({ scope: Scope.REQUEST })
export class ScheduledAgentJobsLoaders {
  readonly checkoutLoader: DataLoader<string, RepositoryCheckout | null>;

  constructor(checkoutsService: RepositoryCheckoutsService) {
    this.checkoutLoader = createEntityByIdLoader(checkoutsService);
  }
}
