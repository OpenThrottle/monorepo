import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ScheduledAgentJobsService } from '@openthrottle/nestjs-repositories';
import {
  type NotificationSeverity,
  SCHEDULED_RUN_FAILURE_REASONS,
  type ScheduledRunFailureReason,
} from '@openthrottle/openthrottle-notifications';

import { NotificationsService } from '../../notifications/notifications.service.ts';
import {
  SCHEDULED_RUN_FAILURE_CHANNELS,
  type ScheduledRunFailureChannel,
  type ScheduledRunFailureNotice,
} from './scheduled-agent-job-failure-channel.ts';

/** What a caller knows about the run(s) that went wrong. */
export interface ScheduledRunFailureInput {
  readonly errorMessage: string | null;
  readonly reason: ScheduledRunFailureReason;
  /** How many runs this covers; a boot that records several missed fires sends one notice. */
  readonly runCount: number;
  readonly runId: string | undefined;
  readonly scheduledAgentJobId: string;
}

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

/** @description A missed fire is a warning (nothing broke); a failure or timeout is an error. */
const severityFor = (
  reason: ScheduledRunFailureReason,
): NotificationSeverity =>
  reason === SCHEDULED_RUN_FAILURE_REASONS.MISSED ? 'warning' : 'error';

/**
 * @description Tells a schedule's owner that a scheduled run failed, timed out, or was recorded
 * missed. Delivery is in-app first (a `scheduled_run.failed` notification on the firehose and the
 * owner's personal topic), then every registered {@link ScheduledRunFailureChannel} — the hook for
 * Slack and Web Push, empty until a channel module provides one.
 *
 * Called from the paths that finish a run badly: the processor, the crash safety net, the boot
 * stuck-run recovery and the misfire bookkeeping. It never throws: a notice is a side effect of the
 * run's own bookkeeping and must never undo or interrupt it.
 */
@Injectable()
export class ScheduledAgentJobFailureNotifierService {
  constructor(
    private readonly logger: LoggerService,
    private readonly jobsService: ScheduledAgentJobsService,
    private readonly notifications: NotificationsService,
    @Inject(SCHEDULED_RUN_FAILURE_CHANNELS)
    private readonly channels: readonly ScheduledRunFailureChannel[],
  ) {}

  async notify(input: ScheduledRunFailureInput): Promise<void> {
    try {
      const notice = await this.buildNotice(input);
      if (notice === null) return;

      this.notifications.emitScheduledRunFailed(notice);
      await this.deliverToChannels(notice);
    } catch (error) {
      this.logger.warn(
        `Could not notify about scheduled job ${input.scheduledAgentJobId} (${input.reason}): ${error instanceof Error ? error.message : String(error)}`,
        ScheduledAgentJobFailureNotifierService.name,
      );
    }
  }

  /** @description The notice for `input`, or null when the schedule is gone (nobody to tell). */
  private async buildNotice(
    input: ScheduledRunFailureInput,
  ): Promise<ScheduledRunFailureNotice | null> {
    if (input.runCount < 1) return null;

    const schedule = await this.jobsService.findJobById(
      input.scheduledAgentJobId,
    );
    if (schedule === null) return null;

    return {
      errorMessage: input.errorMessage,
      link: scheduledRunFailureLink(input),
      message: scheduledRunFailureMessage({
        ...input,
        scheduleName: schedule.name,
      }),
      ownerUserId: schedule.ownerUserId,
      reason: input.reason,
      runCount: input.runCount,
      runId: input.runCount === 1 ? input.runId : undefined,
      scheduleName: schedule.name,
      scheduledAgentJobId: input.scheduledAgentJobId,
      severity: severityFor(input.reason),
    };
  }

  /** @description Hands the notice to every channel, isolating each one's failure. */
  private async deliverToChannels(
    notice: ScheduledRunFailureNotice,
  ): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((channel) => channel.deliver(notice)),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return;

      const name = this.channels[index]?.name ?? 'unknown';
      const reason: unknown = result.reason;
      this.logger.warn(
        `Scheduled-run failure channel "${name}" could not deliver the notice for schedule ${notice.scheduledAgentJobId}: ${reason instanceof Error ? reason.message : String(reason)}`,
        ScheduledAgentJobFailureNotifierService.name,
      );
    });
  }
}
