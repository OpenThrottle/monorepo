/**
 * @description The "Scheduled for <time>. Unschedule and run now?" confirm behind the toolbar's
 * one-click Run on a SCHEDULED plan. It opens when the user clicks Run, and also when the server
 * answers a run-now with `PLAN_ALREADY_SCHEDULED` (a stale page, another tab): either way "yes"
 * re-submits the same run with `cancelScheduled`.
 */
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import {
  PLAN_SCHEDULE_CONFLICT_CODE,
  readPlanScheduleConflictFromData,
} from '~/routing/plans/utils/plan-schedule-conflict';

export interface UsePlanRunNowConfirmOptions {
  readonly fetcherRunPlan: ReturnType<typeof useFetcher<typeof action>>;
  /** @description The one-click Run form's fields; "yes" re-submits them plus `cancelScheduled`. */
  readonly fields: Readonly<Record<string, string>>;
}

export interface UsePlanRunNowConfirmResult {
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onRequest: () => void;
  readonly open: boolean;
  /** @description The fire time the server named in a conflict; `undefined` when the page's own is current. */
  readonly serverScheduledFor: string | null | undefined;
}

export const usePlanRunNowConfirm = (
  options: UsePlanRunNowConfirmOptions,
): UsePlanRunNowConfirmResult => {
  const { fetcherRunPlan, fields } = options;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const [serverScheduledFor, setServerScheduledFor] = React.useState<
    string | null | undefined
  >(undefined);

  // Setup
  const data = fetcherRunPlan.data;

  // Handlers
  const onRequest = (): void => {
    setServerScheduledFor(undefined);
    setOpen(true);
  };

  const onConfirm = (): void => {
    setOpen(false);
    void fetcherRunPlan.submit(
      { ...fields, cancelScheduled: 'true' },
      { method: 'post' },
    );
  };

  // Markup

  // Life Cycle
  // A conflict arrives as data, never as an error toast: open the confirm it asks for.
  React.useEffect(() => {
    const conflict = readPlanScheduleConflictFromData(data, 'runPlanConflict');

    if (conflict?.code === PLAN_SCHEDULE_CONFLICT_CODE.PLAN_ALREADY_SCHEDULED) {
      setServerScheduledFor(conflict.scheduledFor);
      setOpen(true);
    }
  }, [data]);

  // 🔌 Short Circuit

  return {
    onConfirm,
    onOpenChange: setOpen,
    onRequest,
    open,
    serverScheduledFor,
  };
};
