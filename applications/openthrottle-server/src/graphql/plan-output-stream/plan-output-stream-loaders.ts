/**
 * @description Request-scoped DataLoader for PlanOutputStreamResolver (plan by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the plan relation across many output-stream chunk rows.
 */

import {
  type Plan,
  PlansService,
  createEntityByIdLoader,
} from '@openthrottle/nestjs-repositories';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';

/**
 * @description Holds a plan DataLoader for the current request. Injected into PlanOutputStreamResolver; resolve plan via the loader instead of one findOne per chunk row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlanOutputStreamLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;

  constructor(plansService: PlansService) {
    this.planLoader = createEntityByIdLoader(plansService);
  }
}
