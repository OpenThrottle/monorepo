/**
 * @description Request-scoped DataLoader for PlanEmbeddingsResolver (plan by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the plan relation across many embedding rows.
 */

import { Injectable, Scope } from '@nestjs/common';
import {
  createEntityByIdLoader,
  type Plan,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import type DataLoader from 'dataloader';

/**
 * @description Holds a plan DataLoader for the current request. Injected into PlanEmbeddingsResolver; resolve plan via the loader instead of one findOne per embedding row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlanEmbeddingsLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;

  constructor(plansService: PlansService) {
    this.planLoader = createEntityByIdLoader(plansService);
  }
}
