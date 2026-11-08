import { Inject, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { ScheduledAgentJobsService } from '@openthrottle/nestjs-repositories';
import {
  type NotificationSeverity,
  SCHEDULED_RUN_FAILURE_REASONS,
  type ScheduledRunFailureReason,
} from '@openthrottle/openthrottle-notifications';

import { NotificationsService } from '../../../notifications/notifications.service.ts';
import { SCHEDULED_RUN_FAILURE_CHANNELS } from '../scheduled-run-failure-channels.token.ts';
import type { ScheduledRunFailureInput } from './failure-notifier.types.ts';
import type {
  ScheduledRunFailureChannel,
  ScheduledRunFailureNotice,
} from './failure-notifier.types.ts';
import {
  scheduledRunFailureLink,
  scheduledRunFailureMessage,
} from './failure-notifier.utils.ts';

/** @description A missed fire is a warning (nothing broke); a failure or timeout is an error. */
const severityFor = (
  reason: ScheduledRunFailureReason,
): NotificationSeverity => {
  return reason === SCHEDULED_RUN_FAILURE_REASONS.MISSED ? 'warning' : 'error';
};

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
