import type { PlanDetailCancelPlanRunMutation } from '~/__generated__/graphql';

type CancelPayload = PlanDetailCancelPlanRunMutation['cancelPlanRun'];

/**
 * @description User-facing summary after `cancelPlanRun` (toast or inline message).
 */
export const describeCancelPlanRunResult = (payload: CancelPayload): string => {
  if (payload.noMatchingJob) {
    return 'No queued or active plan run was found for this plan.';
  }

  const parts: string[] = [];

  if (payload.removedJobIds.length > 0) {
    parts.push(
      `Removed ${payload.removedJobIds.length} queued job${payload.removedJobIds.length === 1 ? '' : 's'}.`,
    );
  }

  if (payload.signaledActiveRunToStop) {
    parts.push(
      'Signaled the worker to stop the in-flight run (Ralph may take a moment to shut down).',
    );
  }

  if (
    payload.activeJobIdsCouldNotCancel.length > 0 &&
    !payload.signaledActiveRunToStop
  ) {
    parts.push(
      `Some jobs could not be removed while active (${payload.activeJobIdsCouldNotCancel.join(', ')}).`,
    );
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  return 'Plan run cancellation completed.';
};
