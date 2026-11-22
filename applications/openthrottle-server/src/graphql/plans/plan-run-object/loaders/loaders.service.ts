/**
 * @description Request-scoped DataLoaders for PlanRunObjectResolver: the run's
 * checkout by id, and its latest pull_request artifact by plan-run id. A
 * `planRunsByPlanId` list resolving `checkout` and `pullRequest` for N runs
 * costs three queries in total instead of up to three per run.
 */

import { Injectable, Scope } from '@nestjs/common';
import { createEntityByIdLoader } from '@openthrottle/nestjs-postgres';
import type {
  RepositoryCheckout,
  WorkArtifact,
} from '@openthrottle/nestjs-repositories-server';
import {
  RepositoryCheckoutsRepository,
  WorkArtifactsRepository,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import DataLoader from 'dataloader';

import { findLatestPullRequestArtifactsByPlanRunIds } from '../plan-run-object.utils.ts';

@Injectable({ scope: Scope.REQUEST })
export class PlanRunLoaders {
  readonly checkoutLoader: DataLoader<string, RepositoryCheckout | null>;
  readonly pullRequestArtifactByPlanRunIdLoader: DataLoader<
    string,
    WorkArtifact | null
  >;

  constructor(
    repositoryCheckoutsRepository: RepositoryCheckoutsRepository,
    workArtifactsRepository: WorkArtifactsRepository,
    workSessionsRepository: WorkSessionsRepository,
  ) {
    this.checkoutLoader = createEntityByIdLoader(repositoryCheckoutsRepository);

    this.pullRequestArtifactByPlanRunIdLoader = new DataLoader<
      string,
      WorkArtifact | null
    >(async (planRunIds) => {
      const latestByPlanRunId =
        await findLatestPullRequestArtifactsByPlanRunIds(
          workSessionsRepository,
          workArtifactsRepository,
          planRunIds,
        );

      return planRunIds.map((id) => latestByPlanRunId.get(id) ?? null);
    });
  }
}
