import type { ProjectRunPanelDetailsFragment } from '~/__generated__/graphql';

/**
 * @description Where a project's newest run stands, as the project page shows it: never run,
 * running (QUEUED or IN_PROGRESS), or one of the three settled outcomes.
 */
export type ProjectRunState =
  'cancelled' | 'completed' | 'idle' | 'running' | 'stopped';

/**
 * @description Maps a project's newest run (or none) to its {@link ProjectRunState}. An unknown
 * status reads as running, so the page keeps refreshing rather than freezing on it.
 */
export const getProjectRunState = (
  run: ProjectRunPanelDetailsFragment | null | undefined,
): ProjectRunState => {
  if (run == null) {
    return 'idle';
  }

  switch (run.status) {
    case 'CANCELLED':
      return 'cancelled';
    case 'COMPLETED':
      return 'completed';
    case 'STOPPED':
      return 'stopped';
    default:
      return 'running';
  }
};

/**
 * @description The plan ids the project's plan list marks: the plan an active run is on, and the
 * plan a stopped run stopped at.
 */
export const getProjectRunPlanMarkers = (
  run: ProjectRunPanelDetailsFragment | null | undefined,
): {
  readonly currentPlanId: string | null;
  readonly stoppedByPlanId: string | null;
} => {
  const state = getProjectRunState(run);
  const currentPlanId =
    state === 'running' ? (run?.currentPlan?.id ?? null) : null;
  const stoppedByPlanId =
    state === 'stopped' ? (run?.stoppedByPlan?.id ?? null) : null;

  return { currentPlanId, stoppedByPlanId };
};
