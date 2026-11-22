/**
 * @description Shared reads behind a run's (and a plan's) linked pull request: the work-ledger
 * bridge from plan runs to their newest pull_request artifact, and the mapping from that artifact
 * to the GraphQL {@link PlanRunPullRequestObject}.
 */

import type {
  WorkArtifact,
  WorkArtifactsRepository,
  WorkSessionsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { In } from 'typeorm';

import type { SourceControlService } from '../../../services/source-control/source-control.service.ts';
import type { PlanRunPullRequestObject } from '../plan.object.ts';
import { PULL_REQUEST_ARTIFACT_TYPE } from './plan-run-object.constants.ts';

/**
 * @description The newest pull_request artifact of each given plan run, keyed by plan-run id; a
 * run with none is absent. Two queries for the whole batch: every session bridged to one of the
 * runs, then every pull_request artifact on those sessions, newest first, so the first artifact
 * seen for a run is its most recently produced one.
 */
export const findLatestPullRequestArtifactsByPlanRunIds = async (
  workSessionsRepository: WorkSessionsRepository,
  workArtifactsRepository: WorkArtifactsRepository,
  planRunIds: readonly string[],
): Promise<Map<string, WorkArtifact>> => {
  const latestByPlanRunId = new Map<string, WorkArtifact>();

  if (planRunIds.length === 0) {
    return latestByPlanRunId;
  }

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
    return latestByPlanRunId;
  }

  const artifacts = await workArtifactsRepository.findBy({
    order: { producedAt: 'DESC' },
    where: {
      sessionId: In([...planRunIdBySessionId.keys()]),
      type: PULL_REQUEST_ARTIFACT_TYPE,
    },
  });

  for (const artifact of artifacts) {
    const planRunId = planRunIdBySessionId.get(artifact.sessionId);
    if (planRunId !== undefined && !latestByPlanRunId.has(planRunId)) {
      latestByPlanRunId.set(planRunId, artifact);
    }
  }

  return latestByPlanRunId;
};

/**
 * @description Maps a pull_request artifact to the GraphQL PR object, or null when its payload
 * names no repo, no valid number, or a forge the server does not know.
 */
export const toPlanRunPullRequestObject = (
  artifact: WorkArtifact,
  sourceControlService: SourceControlService,
): PlanRunPullRequestObject | null => {
  const repo = String(artifact.payload.repo ?? '');
  const number = Number(artifact.payload.number ?? 0);
  const forge = sourceControlService.forgeForPayload(artifact.payload);

  if (
    repo === '' ||
    !Number.isInteger(number) ||
    number <= 0 ||
    forge == null
  ) {
    return null;
  }

  return {
    number,
    repo,
    state: artifact.lifecycle,
    url: forge.pullRequestUrl(repo, number),
  };
};
