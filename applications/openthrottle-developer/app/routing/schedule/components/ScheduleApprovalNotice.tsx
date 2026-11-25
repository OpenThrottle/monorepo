import * as React from 'react';

import type { ScheduledJobCardFragment } from '~/__generated__/graphql';
import { ScheduleAllowedCommands } from '~/routing/schedule/components/ScheduleAllowedCommands';
import { ScheduleApproveButton } from '~/routing/schedule/components/ScheduleApproveButton';
import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/copy';

export interface ScheduleApprovalNoticeProps {
  readonly job: Pick<
    ScheduledJobCardFragment,
    'allowedCommands' | 'approvalState' | 'id'
  >;
}

/**
 * @description The "Awaiting approval" panel on a schedule's detail page. An agent-created job stays
 * disabled and cannot run until a person approves it, so this is the only place the job can be
 * enabled while pending: Enable is not offered, Approve is. Renders nothing once approved.
 */
export const ScheduleApprovalNotice = (
  props: ScheduleApprovalNoticeProps,
): React.ReactElement | null => {
  const { job } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (job.approvalState !== 'pending') {
    return null;
  }

  return (
    <div
      className="bg-muted/50 flex items-center justify-between gap-4 rounded-md border p-4"
      data-testid="ScheduleApprovalNotice"
      role="status"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">
          {SCHEDULE_APPROVAL_COPY.awaitingHeading}
        </h2>
        <p className="text-muted-foreground text-sm">
          {SCHEDULE_APPROVAL_COPY.awaitingDescription}
        </p>
        <ScheduleAllowedCommands job={job} />
      </div>
      <ScheduleApproveButton jobId={job.id} />
    </div>
  );
};
