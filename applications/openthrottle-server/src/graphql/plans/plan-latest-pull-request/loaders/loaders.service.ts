/**
 * @description Request-scoped DataLoader for PlanLatestPullRequestResolver: each plan's newest
 * pull_request artifact across all of its runs. A list of N plans costs three queries in total
 * (their runs, those runs' sessions, those sessions' PR artifacts) instead of three per plan.
 */

import { Injectable, Scope } from '@nestjs/common';
import type { WorkArtifact } from '@openthrottle/nestjs-repositories-server';
import {
  PlanRunsRepository,
  WorkArtifactsRepository,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import DataLoader from 'dataloader';
import { In } from 'typeorm';

import { findLatestPullRequestArtifactsByPlanRunIds } from '../../plan-run-object/plan-run-object.utils.ts';

@Injectable({ scope: Scope.REQUEST })
export class PlanLatestPullRequestLoaders {
  readonly pullRequestArtifactByPlanIdLoader: DataLoader<
    string,
    WorkArtifact | null
  >;

  constructor(
    planRunsRepository: PlanRunsRepository,
    workArtifactsRepository: WorkArtifactsRepository,
    workSessionsRepository: WorkSessionsRepository,
  ) {
    this.pullRequestArtifactByPlanIdLoader = new DataLoader<
      string,
      WorkArtifact | null
    >(async (planIds) => {
      const runs = await planRunsRepository.findBy({
        select: { id: true, planId: true },
        where: { planId: In([...planIds]) },
      });

      const artifactByRunId = await findLatestPullRequestArtifactsByPlanRunIds(
        workSessionsRepository,
        workArtifactsRepository,
        runs.map((run) => run.id),
      );

      const latestByPlanId = new Map<string, WorkArtifact>();
      for (const run of runs) {
        const artifact = artifactByRunId.get(run.id);
        const current = latestByPlanId.get(run.planId);
        const isNewer =
          artifact !== undefined &&
          (current === undefined || artifact.producedAt > current.producedAt);

        if (isNewer) {
          latestByPlanId.set(run.planId, artifact);
        }
      }

      return planIds.map((planId) => latestByPlanId.get(planId) ?? null);
    });
  }
}
