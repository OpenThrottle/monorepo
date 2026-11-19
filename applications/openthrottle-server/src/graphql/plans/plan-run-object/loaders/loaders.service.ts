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
import { In } from 'typeorm';

/** work_artifacts.type for a pull-request artifact (see artifact-type-registry). */
const PULL_REQUEST_ARTIFACT_TYPE = 'pull_request';

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

    /*
      Two queries for the whole batch: every session bridged to one of the runs,
      then every pull_request artifact on those sessions, newest first. The first
      artifact seen for a run is therefore its most recently produced one, which
      is what the per-run findOne({ order: producedAt DESC }) used to return.
    */
    this.pullRequestArtifactByPlanRunIdLoader = new DataLoader<
      string,
      WorkArtifact | null
    >(async (planRunIds) => {
      const sessions = await workSessionsRepository.findBy({
        where: { planRunId: In([...planRunIds]) },
      });

      const planRunIdBySessionId = new Map<string, string>();
      for (const session of sessions) {
        if (session.planRunId !== null) {
          planRunIdBySessionId.set(session.id, session.planRunId);
        }
      }

      if (planRunIdBySessionId.size === 0) {
        return planRunIds.map(() => null);
      }

      const artifacts = await workArtifactsRepository.findBy({
        order: { producedAt: 'DESC' },
        where: {
          sessionId: In([...planRunIdBySessionId.keys()]),
          type: PULL_REQUEST_ARTIFACT_TYPE,
        },
      });

      const latestByPlanRunId = new Map<string, WorkArtifact>();
      for (const artifact of artifacts) {
        const planRunId = planRunIdBySessionId.get(artifact.sessionId);
        if (planRunId !== undefined && !latestByPlanRunId.has(planRunId)) {
          latestByPlanRunId.set(planRunId, artifact);
        }
      }

      return planRunIds.map((id) => latestByPlanRunId.get(id) ?? null);
    });
  }
}
