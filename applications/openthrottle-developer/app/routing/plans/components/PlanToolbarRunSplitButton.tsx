import {
  Button,
  ButtonGroup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, PlayCircle, XCircle } from 'lucide-react';
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import { PlanRunDialogConfirm } from '~/routing/plans/components/PlanRunDialogConfirm';
import { PlanRunDialogHiddenFields } from '~/routing/plans/components/PlanRunDialogHiddenFields';
import { PlanToolbarScheduleMenuItem } from '~/routing/plans/components/PlanToolbarScheduleMenuItem';
import {
  PLAN_RUN_CANCEL_SCHEDULED_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';
import { usePlanRunNowConfirm } from '~/routing/plans/hooks/usePlanRunNowConfirm';
import type { PlanRunDialogMode } from '~/routing/plans/types';
import { isPlanRunBranchMissing } from '~/routing/plans/utils/plan-run-dialog';
import { getPlanScheduleDisabledReason } from '~/routing/plans/utils/plan-schedule-gate';
import { buildPlanToolbarRunFields } from '~/routing/plans/utils/plan-toolbar-run-fields';
import {
  getPlanToolbarRunButtonLabel,
  getPlanToolbarRunTooltip,
} from '~/routing/plans/utils/plan-toolbar-run-label';

export interface PlanToolbarRunSplitButtonProps {
  readonly branch?: string;
  readonly checkoutId?: string;
  readonly fetcherRunPlan: ReturnType<typeof useFetcher<typeof action>>;
  readonly isRunning: boolean;
  readonly isTerminal: boolean;
  readonly jobRunHooksJson: string;
  /** @description Opens the cancel-scheduled-run confirm; the dialog lives outside this control. */
  readonly onOpenCancelScheduled: () => void;
  /** @description Opens the Run dialog on the given tab; the dialog lives outside this control. */
  readonly onOpenDialog: (mode: PlanRunDialogMode) => void;
  readonly planStatus?: string;
  readonly ralphTuningJson: string;
  readonly repositoryId?: string;
  /** @description Tasks a whole-plan run would pick up; 0 disables Run and Schedule (the server refuses both). `undefined` = unknown, not gated. */
  readonly runnableTaskCount?: number;
  /** @description The soonest SCHEDULED run's fire time; non-null makes Run ask to unschedule first. */
  readonly scheduledRunAt?: Date | string | null;
  /** @description Id of that same scheduled run; non-null adds "Cancel scheduled run" to the caret menu. */
  readonly scheduledRunId?: string | null;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason?: string;
  readonly workingDirectory?: string;
}

/**
 * @description The toolbar's Run control as a split button: a one-click `runPlan` form, plus a
 * caret dropdown (outside the form) that opens the Run dialog on its Run or Schedule tab. On a
 * scheduled plan Run first confirms "Unschedule and run now?" (as does a server
 * `PLAN_ALREADY_SCHEDULED`) and submits with `cancelScheduled`; Schedule reads Reschedule….
 */
export const PlanToolbarRunSplitButton = (
  props: PlanToolbarRunSplitButtonProps,
): React.ReactElement => {
  const {
    branch,
    checkoutId,
    fetcherRunPlan,
    isRunning,
    isTerminal,
    jobRunHooksJson,
    onOpenCancelScheduled,
    onOpenDialog,
    planStatus,
    ralphTuningJson,
    repositoryId,
    runnableTaskCount,
    scheduledRunAt,
    scheduledRunId,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  } = props;

  // Hooks
  const runFields = buildPlanToolbarRunFields({
    branch,
    checkoutId,
    jobRunHooksJson,
    ralphTuningJson,
    repositoryId,
    workingDirectory,
  });
  const runNowConfirm = usePlanRunNowConfirm({
    fetcherRunPlan,
    fields: runFields,
  });

  // Setup
  // Branch is a REQUIRED enqueue input; with it blank the run would fail fast at
  // the server boundary, so gate the Run control and surface the reason.
  const branchMissing = isPlanRunBranchMissing(branch);
  const noRunnableTasks = runnableTaskCount === 0;
  const isScheduled = scheduledRunAt != null;
  const canCancelScheduled = scheduledRunId != null;
  const isSubmitting = fetcherRunPlan.state !== 'idle';
  const scheduleDisabledReason = getPlanScheduleDisabledReason(
    planStatus,
    noRunnableTasks,
  );
  const isRescheduling = isScheduled || planStatus === 'SCHEDULED';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ButtonGroup data-testid="PlanToolbarRunSplitButton">
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <fetcherRunPlan.Form method="post">
            <PlanRunDialogHiddenFields fields={runFields} />
            <Button
              className="rounded-r-none"
              disabled={
                isSubmitting ||
                workflowRunBlocked ||
                branchMissing ||
                isRunning ||
                isTerminal ||
                noRunnableTasks
              }
              onClick={isScheduled ? runNowConfirm.onRequest : undefined}
              size="xs"
              type={isScheduled ? 'button' : 'submit'}
              variant="ghost"
            >
              <PlayCircle />
              {getPlanToolbarRunButtonLabel(planStatus)}
            </Button>
          </fetcherRunPlan.Form>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs" side="top">
          {getPlanToolbarRunTooltip({
            branchMissing,
            isRunning,
            isSubmitting,
            isTerminal,
            noRunnableTasks,
            scheduledRunAt,
            workflowRunBlocked,
            workflowRunBlockedReason,
          })}
        </TooltipContent>
      </Tooltip>

      {/* Non-modal so selecting an item can hand focus to the dialog without the
          menu's modal layer leaving the page inert behind it. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild={true}>
          <Button
            aria-label={PLAN_TOOLBAR_COPY.runCaretAriaLabel}
            disabled={(isTerminal || noRunnableTasks) && !canCancelScheduled}
            size="xs"
            type="button"
            variant="ghost"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isRunning || isTerminal || noRunnableTasks}
            onSelect={() => onOpenDialog('run')}
          >
            <PlayCircle />
            {PLAN_TOOLBAR_COPY.runWithOptionsLabel}
          </DropdownMenuItem>
          <PlanToolbarScheduleMenuItem
            disabledReason={scheduleDisabledReason}
            isRescheduling={isRescheduling}
            onSelect={() => onOpenDialog('schedule')}
          />
          {canCancelScheduled && (
            <DropdownMenuItem onSelect={onOpenCancelScheduled}>
              <XCircle />
              {PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <PlanRunDialogConfirm
        mode="run"
        onConfirm={runNowConfirm.onConfirm}
        onOpenChange={runNowConfirm.onOpenChange}
        open={runNowConfirm.open}
        scheduledFor={runNowConfirm.serverScheduledFor ?? scheduledRunAt}
      />
    </ButtonGroup>
  );
};
