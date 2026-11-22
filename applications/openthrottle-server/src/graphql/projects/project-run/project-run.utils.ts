import type {
  Plan,
  ProjectRun,
} from '@openthrottle/nestjs-repositories-server';
import { GraphQLError } from 'graphql';

import { PROJECT_RUN_PASSED_OVER_PLAN_STATUSES } from '../../../services/project-run-advance/project-run-advance.constants.ts';
import type { ProjectRunObject } from '../project-run.object.ts';
import { PROJECT_RUN_ERROR_CODE } from './project-run.constants.ts';

/**
 * @description Whether a project has a plan a run would work on: any plan the advance step would
 * not pass over (a BLOCKED one counts, since the run stops on it and says so).
 */
export const hasPlanToRun = (plans: readonly Plan[]): boolean => {
  return plans.some((plan) => {
    return !PROJECT_RUN_PASSED_OVER_PLAN_STATUSES.includes(plan.status);
  });
};

/** @description Maps a project_runs row to its GraphQL object (the plan relations resolve lazily). */
export const toProjectRunObject = (run: ProjectRun): ProjectRunObject => {
  return {
    cancelRequestedAt: run.cancelRequestedAt,
    createdAt: run.createdAt,
    currentPlanId: run.currentPlanId,
    id: run.id,
    projectId: run.projectId,
    settledAt: run.settledAt,
    startedAt: run.startedAt,
    status: run.status,
    stoppedByPlanId: run.stoppedByPlanId,
    stoppedReason: run.stoppedReason,
  };
};

/** @description The client-readable refusal for a project that already has an active run. */
export const createProjectRunActiveError = (
  projectRunId: string | null,
): GraphQLError => {
  return new GraphQLError(`This project already has an active run.`, {
    extensions: { code: PROJECT_RUN_ERROR_CODE.ACTIVE, projectRunId },
  });
};

/** @description The client-readable refusal for a project with nothing left to run. */
export const createProjectRunNothingToRunError = (): GraphQLError => {
  return new GraphQLError(
    `This project has no plan left to run: it has no plans, or every plan is COMPLETED, SKIPPED or CANCELED.`,
    { extensions: { code: PROJECT_RUN_ERROR_CODE.NOTHING_TO_RUN } },
  );
};

/** @description The client-readable not-found error for a project or project run id. */
export const createProjectRunNotFoundError = (what: string): GraphQLError => {
  return new GraphQLError(`${what} not found.`, {
    extensions: { code: PROJECT_RUN_ERROR_CODE.NOT_FOUND },
  });
};
