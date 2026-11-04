import type {
  NotificationSeverity,
  ScheduledRunFailureReason,
} from '@openthrottle/openthrottle-notifications';

/**
 * @description Everything a delivery channel needs to tell a schedule's owner that a run went
 * wrong. Built once by the failure notifier, then handed unchanged to the in-app emit and to every
 * registered {@link ScheduledRunFailureChannel}.
 */
export interface ScheduledRunFailureNotice {
  /** The run's own error detail, when there is one. */
  readonly errorMessage: string | null;
  /** App-relative path to the run (one run) or the schedule (several). */
  readonly link: string;
  /** One-line, human-readable summary. */
  readonly message: string;
  /** Who to tell. Null for a schedule with no owner; a channel that targets a person skips it. */
  readonly ownerUserId: string | null;
  readonly reason: ScheduledRunFailureReason;
  readonly runCount: number;
  readonly runId: string | undefined;
  readonly scheduleName: string;
  readonly scheduledAgentJobId: string;
  readonly severity: NotificationSeverity;
}

/**
 * @description An out-of-app delivery channel for scheduled-run failure notices, such as Slack or
 * Web Push. In-app delivery is built in; a channel is extra. `deliver` may throw or reject: the
 * notifier isolates each channel, so one broken channel never blocks another or the run's own
 * bookkeeping.
 */
export interface ScheduledRunFailureChannel {
  deliver(notice: ScheduledRunFailureNotice): Promise<void>;
  /** Short id for logs, e.g. `slack`. */
  readonly name: string;
}

/**
 * @description Injection token for the registered {@link ScheduledRunFailureChannel} list. The
 * queue module provides an empty list; a channel module overrides it with its own channels.
 */
export const SCHEDULED_RUN_FAILURE_CHANNELS = 'SCHEDULED_RUN_FAILURE_CHANNELS';
