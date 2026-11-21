import { Button } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { action as scheduleDetailAction } from '~/routes/schedule.$jobId._index';
import { SCHEDULE_APPROVAL_COPY } from '~/routing/schedule/data/data.copy';

export interface ScheduleApproveButtonProps {
  readonly jobId: string;
}

/**
 * @description Approves an agent-created schedule that is awaiting approval: posts the `approve`
 * intent to the job's detail route, which calls `approveScheduledAgentJob` (it marks the job approved
 * and enables it). A fetcher rather than a navigation, so it works from the list rows as well as the
 * detail page, and both revalidate their loaders when it settles.
 */
export const ScheduleApproveButton = (
  props: ScheduleApproveButtonProps,
): React.ReactElement => {
  const { jobId } = props;

  // Hooks
  const fetcher = useFetcher<typeof scheduleDetailAction>();

  // Setup
  const ApproveForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const data = fetcher.data;
  const error = data != null && 'error' in data ? data.error : undefined;

  // Handlers

  // Markup
  const errorAlert = (
    <p className="text-destructive text-xs" role="alert">
      {error || SCHEDULE_APPROVAL_COPY.approveError}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ApproveForm
      action={`/schedule/${jobId}`}
      className="flex flex-col gap-1"
      data-testid="ScheduleApproveButton"
      method="post"
    >
      <input name="intent" type="hidden" value="approve" />
      <Button disabled={isSubmitting} size="xs" type="submit">
        {isSubmitting
          ? SCHEDULE_APPROVAL_COPY.approveSubmitting
          : SCHEDULE_APPROVAL_COPY.approveAction}
      </Button>
      {error === undefined ? null : errorAlert}
    </ApproveForm>
  );
};
