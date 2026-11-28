/**
 * @description Links between the trajectory surfaces: a task's Trajectories
 * tab, the plan groups on /evals/trajectories and the viewer under /evals.
 */
import type { TrajectoryScoreFilterValue } from '~/routing/evals/config/defaults';
import {
  TRAJECTORY_SCORE_FILTER,
  TRAJECTORY_SCORE_FILTER_PARAM,
} from '~/routing/evals/config/defaults';

/**
 * @description The DOM id of a plan group on /evals/trajectories, so a link
 * can land on it. Trajectories of deleted plans share the `unknown` group.
 */
export const trajectoryPlanGroupAnchor = (planId: string | null): string => {
  return `plan-group-${planId ?? 'unknown'}`;
};

/**
 * @description A plan's group on /evals/trajectories. It opens the All filter,
 * because the group must still be listed once every trajectory is scored.
 */
export const buildTrajectoryPlanGroupHref = (planId: string | null): string => {
  const search = `${TRAJECTORY_SCORE_FILTER_PARAM}=${TRAJECTORY_SCORE_FILTER.all}`;

  return `/evals/trajectories?${search}#${trajectoryPlanGroupAnchor(planId)}`;
};

/** @description The viewer for any trajectory, task-scoped or plan-scoped. */
export const buildTrajectoryViewerHref = (trajectoryId: string): string => {
  return `/evals/trajectories/${trajectoryId}`;
};

/** @description A task page's Trajectories tab. */
export const buildTaskTrajectoriesHref = (
  planId: string,
  taskId: string,
): string => {
  return `/plans/${planId}/tasks/${taskId}?tab=trajectories`;
};

export interface TrajectoriesListHrefInput {
  /** The previous page's `endCursor`, for a load-more fetch; null otherwise. */
  readonly after: string | null;
  readonly filter: TrajectoryScoreFilterValue;
  /** Narrow to one repository; null for every repository. */
  readonly repositoryId: string | null;
}

/**
 * @description /evals/trajectories with its filter, repository and cursor in
 * the query string. The default filter (unscored) is left out so the tab's
 * plain URL stays plain.
 */
export const buildTrajectoriesListHref = (
  input: TrajectoriesListHrefInput,
): string => {
  const params = new URLSearchParams();

  if (input.filter !== TRAJECTORY_SCORE_FILTER.unscored) {
    params.set(TRAJECTORY_SCORE_FILTER_PARAM, input.filter);
  }

  if (input.repositoryId !== null) {
    params.set('repositoryId', input.repositoryId);
  }

  if (input.after !== null) {
    params.set('after', input.after);
  }

  const search = params.toString();

  return search === ''
    ? '/evals/trajectories'
    : `/evals/trajectories?${search}`;
};
