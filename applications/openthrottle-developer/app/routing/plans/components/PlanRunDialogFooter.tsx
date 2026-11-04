import {
  Alert,
  AlertDescription,
  Button,
  DialogFooter,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_RUN_DIALOG_COPY } from '~/routing/plans/data/data.copy';
import type { PlanRunDialogMode } from '~/routing/plans/types';
import { getPlanRunDialogSubmitLabel } from '~/routing/plans/utils/plan-run-dialog';

export interface PlanRunDialogFooterProps {
  /** @description Named reason submit is disabled; shown above the buttons so a disabled button is never unexplained. */
  readonly blockedReason: string | null;

  /** @description The action's error for the current mode, kept inline until the next attempt. */
  readonly errorMessage: string | undefined;
  readonly isSubmitting: boolean;
  readonly mode: PlanRunDialogMode;
  readonly onCancel: () => void;
}

/**
 * @description The Run dialog's footer: the inline action error, the named reason submit
 * is blocked, and the Cancel / Run now (or Schedule run) buttons.
 */
export const PlanRunDialogFooter = (
  props: PlanRunDialogFooterProps,
): React.ReactElement => {
  const { blockedReason, errorMessage, isSubmitting, mode, onCancel } = props;

  // Hooks
  const blockedId = React.useId();

  // Setup
  const blocked = blockedReason !== null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {errorMessage !== undefined ? (
        <Alert data-testid="PlanRunDialog-error" variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}
      {blocked ? (
        <p
          className="text-muted-foreground text-sm"
          data-testid="PlanRunDialog-blocked-reason"
          id={blockedId}
        >
          {blockedReason}
        </p>
      ) : null}
      <DialogFooter>
        <Button onClick={onCancel} type="button" variant="ghost">
          {PLAN_RUN_DIALOG_COPY.cancelLabel}
        </Button>
        <Button
          aria-describedby={blocked ? blockedId : undefined}
          disabled={blocked || isSubmitting}
          type="submit"
        >
          {getPlanRunDialogSubmitLabel(mode, isSubmitting)}
        </Button>
      </DialogFooter>
    </>
  );
};
