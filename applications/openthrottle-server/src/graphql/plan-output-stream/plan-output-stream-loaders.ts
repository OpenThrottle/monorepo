/**
 * @description Request-scoped DataLoader for PlanOutputStreamResolver (plan by id). One instance per GraphQL request to batch and cache within the request and avoid N+1 when resolving the plan relation across many output-stream chunk rows.
 */

import { type Plan, PlansService } from '@openthrottle/nestjs-repositories';
import { createLoaderFromFindByIds } from '@openthrottle/nestjs-utils';
import { Injectable, Scope } from '@nestjs/common';
import type DataLoader from 'dataloader';
import { In } from 'typeorm';

/**
 * @description Holds a plan DataLoader for the current request. Injected into PlanOutputStreamResolver; resolve plan via the loader instead of one findOne per chunk row.
 */
@Injectable({ scope: Scope.REQUEST })
export class PlanOutputStreamLoaders {
  readonly planLoader: DataLoader<string, Plan | null>;

  constructor(private readonly plansService: PlansService) {
    this.planLoader = createLoaderFromFindByIds<string, Plan>(async (ids) => {
      if (ids.length === 0) return [];

      const list = await this.plansService
        .getRepository()
        .find({ where: { id: In(ids) } });

      return list;
    });
  }
}
