import { useScheduleAutoRefresh } from '~/routing/schedule/hooks/useScheduleAutoRefresh';

export interface UseProjectRunAutoRefreshOptions {
  /** Whether the project's newest run is still QUEUED or IN_PROGRESS. */
  readonly isActive: boolean;
}

/**
 * @description Keeps the project page current while a project run is active, so the run panel and
 * the plan rows follow it plan by plan. It is the /schedule page's polling with one run in flight
 * (nothing publishes project-run transitions as a subscription): revalidate on an interval, skip a
 * tick while one is in flight or the tab is hidden, catch up when the tab returns, and take one
 * final reading when the run settles.
 */
export const useProjectRunAutoRefresh = (
  options: UseProjectRunAutoRefreshOptions,
): void => {
  const { isActive } = options;

  // Hooks
  useScheduleAutoRefresh(isActive ? 1 : 0);

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
};
