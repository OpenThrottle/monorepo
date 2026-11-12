import * as React from 'react';

import { PlanScheduleConfirmDialog } from '~/routing/plans/components/PlanScheduleConfirmDialog';
import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunDialogMode } from '~/routing/plans/types';
import { formatPlanScheduledFor } from '~/routing/plans/utils/formatPlanScheduledFor';

export interface PlanRunDialogConfirmProps {
  /** @description The tab being submitted: Run now unschedules, Schedule replaces. */
  readonly mode: PlanRunDialogMode;
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  /** @description The existing scheduled run's fire time, named in the question. */
  readonly scheduledFor: Date | string | null | undefined;
}

/**
 * @description The {@link PlanRunDialog}'s unschedule-first confirm, worded for the tab that was
 * submitted: "Scheduled for <time>. Unschedule and run now?" or "Scheduled for <time>. Replace it?".
 */
export const PlanRunDialogConfirm = (
  props: PlanRunDialogConfirmProps,
): React.ReactElement => {
  const { mode, onConfirm, onOpenChange, open, scheduledFor } = props;

  // Hooks

  // Setup
  const copy = PLAN_SCHEDULE_CONFIRM_COPY;
  const localTime = formatPlanScheduledFor(scheduledFor);
  const isReplace = mode === 'schedule';
  const title = isReplace
    ? copy.replaceTitle(localTime)
    : copy.runNowTitle(localTime);
  const description = isReplace ? copy.replaceBody : copy.runNowBody;
  const confirmLabel = isReplace
    ? copy.replaceConfirmLabel
    : copy.runNowConfirmLabel;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <PlanScheduleConfirmDialog
      confirmLabel={confirmLabel}
      description={description}
      isPending={false}
      onConfirm={onConfirm}
      onOpenChange={onOpenChange}
      open={open}
      title={title}
    />
  );
};
