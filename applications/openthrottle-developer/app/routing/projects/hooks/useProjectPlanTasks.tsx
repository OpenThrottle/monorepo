import * as React from 'react';
import { useFetcher } from 'react-router';

import type { ProjectPlanTaskRowFragment } from '~/__generated__/graphql';
import { PROJECT_PLAN_TASKS_PATH } from '~/routing/projects/config/projects.defaults';
import type {
  ProjectPlanTasksData,
  ProjectPlanTasksFailed,
} from '~/routing/projects/types';

export interface UseProjectPlanTasksOptions {
  /** The plan whose tasks the row expands to show. */
  readonly planId: string;
}

interface ProjectPlanTasksBase {
  /** Fetch the tasks; a no-op while loading or once loaded, a retry after an error. */
  readonly load: () => void;
}

interface ProjectPlanTasksIdle extends ProjectPlanTasksBase {
  readonly state: 'idle';
}

interface ProjectPlanTasksLoading extends ProjectPlanTasksBase {
  readonly state: 'loading';
}

interface ProjectPlanTasksReady extends ProjectPlanTasksBase {
  readonly state: 'loaded';
  readonly tasks: readonly ProjectPlanTaskRowFragment[];
}

interface ProjectPlanTasksError extends ProjectPlanTasksBase {
  readonly reason: ProjectPlanTasksFailed['reason'];
  readonly state: 'error';
}

export type UseProjectPlanTasksResult =
  | ProjectPlanTasksError
  | ProjectPlanTasksIdle
  | ProjectPlanTasksLoading
  | ProjectPlanTasksReady;

/**
 * @description On-demand task list for one plan row on `/projects/:projectId`.
 * Nothing is fetched until `load()` is called (the row's first expand); it then
 * runs one `fetcher.load` against `PROJECT_PLAN_TASKS_PATH` and keeps the
 * result for the life of the page, so collapsing and re-expanding never
 * refetches. It never navigates or touches the URL, so the route loader and its
 * `?page=` pagination are untouched.
 */
export const useProjectPlanTasks = (
  options: UseProjectPlanTasksOptions,
): UseProjectPlanTasksResult => {
  const { planId } = options;

  // Hooks
  const fetcher = useFetcher<ProjectPlanTasksData>({
    key: `project-plan-tasks-${planId}`,
  });

  // Setup
  // A keyed fetcher is already per plan; guarding on the echoed id as well means
  // a row can never render another plan's tasks.
  const data = fetcher.data?.planId === planId ? fetcher.data : undefined;
  const isLoaded = data?.kind === 'loaded';
  const isBusy = fetcher.state !== 'idle';
  const { load: fetcherLoad } = fetcher;

  // Handlers
  const load = React.useCallback((): void => {
    if (isLoaded || isBusy) {
      return;
    }

    const search = new URLSearchParams({ planId }).toString();
    void fetcherLoad(`${PROJECT_PLAN_TASKS_PATH}?${search}`);
  }, [fetcherLoad, isBusy, isLoaded, planId]);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (data?.kind === 'loaded') {
    return { load, state: 'loaded', tasks: data.tasks };
  }

  if (isBusy) {
    return { load, state: 'loading' };
  }

  if (data?.kind === 'error') {
    return { load, reason: data.reason, state: 'error' };
  }

  return { load, state: 'idle' };
};
