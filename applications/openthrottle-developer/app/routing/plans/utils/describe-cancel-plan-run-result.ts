import type { PlanDetailCancelPlanRunMutation } from '~/__generated__/graphql';

type CancelPayload = PlanDetailCancelPlanRunMutation['cancelPlanRun'];

/**
 * @description Toast tone for a cancel outcome. Only NO_ACTIVE_RUN is a no-op (nothing was
 * cancelled) — surfaced as an explicit `info`, never a misleading `success`. Every other outcome
 * did something (removed a job, or signaled/requested a stop) and is a `success`.
 */
export const cancelPlanRunToastTone = (
  payload: CancelPayload,
): 'info' | 'success' =>
  payload.outcome === 'NO_ACTIVE_RUN' ? 'info' : 'success';

/**
 * @description User-facing summary after `cancelPlanRun` (toast or inline message), keyed off the
 * server's machine-readable `outcome` so the message always reflects the path that actually fired
 * (kill-semantics matrix, OT plan 2ab62876) — never an ambiguous "success" on a no-op.
 */
export const describeCancelPlanRunResult = (payload: CancelPayload): string => {
  switch (payload.outcome) {
    case 'RUN_CANCELLED': {
      const count = payload.removedJobIds.length;
      return `Run cancelled — removed ${count} queued job${count === 1 ? '' : 's'} from the queue.`;
    }
    case 'RUN_STOPPING':
      return 'Run stopping — signaled the worker to terminate the active run (Ralph may take a moment to shut down).';
    case 'CANCELLATION_REQUESTED':
      return 'Cancellation requested — the run stops at its next checkpoint.';
    case 'NO_ACTIVE_RUN':
      return 'No queued or active plan run was found to cancel.';
    default:
      return 'Plan run cancellation processed.';
  }
};
