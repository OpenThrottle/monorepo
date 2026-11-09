import {
  SCHEDULED_RUN_FAILURE_REASONS,
  type ScheduledRunFailureReason,
} from '@openthrottle/openthrottle-notifications';
/** @description The developer-app path a notice links to: the run when there is one, else the schedule. */
export const scheduledRunFailureLink = (input: {
  readonly runCount: number;
  readonly runId: string | undefined;
  readonly scheduledAgentJobId: string;
}): string => {
  const schedulePath = `/schedule/${input.scheduledAgentJobId}`;

  return input.runId !== undefined && input.runCount === 1
    ? `${schedulePath}/runs/${input.runId}`
    : schedulePath;
};

/** @description The one-line summary a notice shows, naming the schedule and what went wrong. */
export const scheduledRunFailureMessage = (input: {
  readonly errorMessage: string | null;
  readonly reason: ScheduledRunFailureReason;
  readonly runCount: number;
  readonly scheduleName: string;
}): string => {
  const subject = `Scheduled job "${input.scheduleName}"`;
  // A missed run's stored message opens with "Missed: ", which the summary already says.
  const reasonText = input.errorMessage?.replace(/^Missed:\s*/u, '') ?? null;
  const detail = reasonText === null ? '' : `: ${reasonText}`;

  switch (input.reason) {
    case SCHEDULED_RUN_FAILURE_REASONS.MISSED:
      return input.runCount === 1
        ? `${subject} missed a run${detail}`
        : `${subject} missed ${input.runCount} runs${detail}`;
    case SCHEDULED_RUN_FAILURE_REASONS.TIMED_OUT:
      return `${subject} timed out${detail}`;
    default:
      return `${subject} failed${detail}`;
  }
};
