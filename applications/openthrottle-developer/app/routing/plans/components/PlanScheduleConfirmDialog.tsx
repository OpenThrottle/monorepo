import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_SCHEDULE_CONFIRM_COPY } from '~/routing/plans/data/data.copy';

export interface PlanScheduleConfirmDialogProps {
  /** @description The affirmative button, e.g. "Unschedule and run now". */
  readonly confirmLabel: string;
  /** @description Optional second line under the title. */
  readonly description?: string;
  /** @description True while the confirmed request is in flight; locks both buttons. */
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  /** @description The question, e.g. "Scheduled for Nov 8, 9:00 AM. Unschedule and run now?". */
  readonly title: string;
}

/**
 * @description The one confirm every unschedule-first flow shares (Run now, Reschedule, a status
 * change on a SCHEDULED plan, a server `PLAN_ALREADY_SCHEDULED` conflict). It is controlled and
 * submits nothing itself: the caller owns what "yes" does, so the same dialog serves a form
 * submit, a fetcher submit and a dialog's own submit.
 */
export const PlanScheduleConfirmDialog = (
  props: PlanScheduleConfirmDialogProps,
): React.ReactElement => {
  const {
    confirmLabel,
    description,
    isPending,
    onConfirm,
    onOpenChange,
    open,
    title,
  } = props;

  // Hooks

  // Setup
  const { keepLabel, pendingLabel } = PLAN_SCHEDULE_CONFIRM_COPY;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={onOpenChange} open={open}>
      <AlertDialogContent data-testid="PlanScheduleConfirmDialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description !== undefined && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} type="button">
            {keepLabel}
          </AlertDialogCancel>
          <Button disabled={isPending} onClick={onConfirm} type="button">
            {isPending ? pendingLabel : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
