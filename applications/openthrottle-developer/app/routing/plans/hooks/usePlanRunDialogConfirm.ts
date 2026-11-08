/**
 * @description The unschedule-first confirm inside {@link PlanRunDialog}. While the plan has a
 * scheduled run, a submit does not post: it asks first ("Unschedule and run now?" on the Run tab,
 * "Replace it?" on the Schedule tab), and "yes" posts the same fields plus `cancelScheduled` or
 * `replaceScheduled`. The same confirm opens when the server answers with
 * `PLAN_ALREADY_SCHEDULED`, which is how a stale page or another tab lands here.
 */
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import type { PlanRunDialogMode } from '~/routing/plans/types';
import {
  PLAN_SCHEDULE_CONFLICT_CODE,
  readPlanScheduleConflictFromData,
} from '~/routing/plans/utils/plan-schedule-conflict';

export interface UsePlanRunDialogConfirmOptions {
  readonly fetcher: ReturnType<typeof useFetcher<typeof action>>;
  /** @description The dialog's hidden form fields; "yes" posts them plus the confirm flag. */
  readonly fields: Readonly<Record<string, string>>;
  readonly mode: PlanRunDialogMode;
  readonly open: boolean;
  /** @description The plan's scheduled run; non-null makes every submit ask first. */
  readonly scheduledRunAt: Date | string | null | undefined;
}

export interface UsePlanRunDialogConfirmResult {
  readonly confirmOpen: boolean;
  readonly onConfirm: () => void;
  readonly onConfirmOpenChange: (open: boolean) => void;
  /** @description Opens the confirm and returns true when the plan is scheduled; false means post as usual. */
  readonly requestConfirm: () => boolean;
  /** @description The fire time the server named in a conflict; `undefined` when the page's own is current. */
  readonly serverScheduledFor: string | null | undefined;
}

export const usePlanRunDialogConfirm = (
  options: UsePlanRunDialogConfirmOptions,
): UsePlanRunDialogConfirmResult => {
  const { fetcher, fields, mode, open, scheduledRunAt } = options;

  // Hooks
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [serverScheduledFor, setServerScheduledFor] = React.useState<
    string | null | undefined
  >(undefined);

  // Setup
  const data = fetcher.data;

  // Handlers
  const requestConfirm = (): boolean => {
    if (scheduledRunAt == null) {
      return false;
    }

    setServerScheduledFor(undefined);
    setConfirmOpen(true);

    return true;
  };

  const onConfirm = (): void => {
    const flag = mode === 'schedule' ? 'replaceScheduled' : 'cancelScheduled';

    setConfirmOpen(false);
    void fetcher.submit({ ...fields, [flag]: 'true' }, { method: 'post' });
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
    }
  }, [open]);

  // A conflict arrives as data, never as an inline error: open the confirm it asks for.
  React.useEffect(() => {
    const conflict =
      readPlanScheduleConflictFromData(data, 'runPlanConflict') ??
      readPlanScheduleConflictFromData(data, 'schedulePlanRunConflict');

    if (conflict?.code === PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED) {
      setServerScheduledFor(conflict.scheduledFor);
      setConfirmOpen(true);
    }
  }, [data]);

  // 🔌 Short Circuit

  return {
    confirmOpen,
    onConfirm,
    onConfirmOpenChange: setConfirmOpen,
    requestConfirm,
    serverScheduledFor,
  };
};
