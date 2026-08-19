/**
 * @description Status-transition state for {@link PlanTaskToolbar}: the
 * `setTaskStatus` fetcher, the completed gate, and the success/error toast
 * wiring. Extracted from the component per component-primitive-shape R7 so the
 * toolbar stays UI-focused.
 */
import { useFetcher } from 'react-router';
import { useActionToast } from '~/global/hooks/useActionToast';
import type { PlanTaskDetailActionData } from '~/routing/plans/actions/taskId';

export interface UsePlanTaskToolbarOptions {
  /**
   * @description Current task status; gates the Mark Complete control.
   */
  readonly taskStatus?: string;
}

export interface UsePlanTaskToolbarResult {
  readonly fetcherSetStatus: ReturnType<
    typeof useFetcher<PlanTaskDetailActionData>
  >;
  readonly isCompleted: boolean;
}

export const usePlanTaskToolbar = (
  options: UsePlanTaskToolbarOptions,
): UsePlanTaskToolbarResult => {
  const { taskStatus } = options;

  // Hooks
  const fetcherSetStatus = useFetcher<PlanTaskDetailActionData>();

  // Setup
  const isCompleted = taskStatus === 'COMPLETED';
  const setStatusData = fetcherSetStatus.data;
  const setStatusError =
    setStatusData != null &&
    typeof setStatusData === 'object' &&
    'setTaskStatusError' in setStatusData &&
    typeof setStatusData.setTaskStatusError === 'string'
      ? setStatusData.setTaskStatusError
      : undefined;

  // Handlers

  // Markup

  // Life Cycle
  useActionToast(fetcherSetStatus.data, {
    active: fetcherSetStatus.state !== 'idle',
    error: () => setStatusError,
    id: 'set-task-status',
    success: 'Task marked complete.',
  });

  // 🔌 Short Circuit
  return { fetcherSetStatus, isCompleted };
};
