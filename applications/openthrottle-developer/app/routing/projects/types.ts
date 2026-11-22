import type {
  ProjectCardFragment,
  ProjectPlanTaskRowFragment,
} from '~/__generated__/graphql';

/**
 * @description Project shape with optional stats for UI mock-up. When the API adds planCount/lastActivityAt, switch data source; no type change needed.
 */
export interface ProjectWithStats extends ProjectCardFragment {
  readonly lastActivityAt?: string | null;
  readonly planCount?: number | null;
}

/** @description A plan's tasks, loaded on demand by `/resources/project-plan-tasks`. */
export interface ProjectPlanTasksLoaded {
  readonly kind: 'loaded';
  readonly planId: string;
  readonly tasks: readonly ProjectPlanTaskRowFragment[];
}

/** @description Why `/resources/project-plan-tasks` could not answer. */
export interface ProjectPlanTasksFailed {
  readonly kind: 'error';
  readonly planId: string;
  readonly reason: 'invalid-plan-id' | 'request-failed';
}

export type ProjectPlanTasksData =
  ProjectPlanTasksFailed | ProjectPlanTasksLoaded;
