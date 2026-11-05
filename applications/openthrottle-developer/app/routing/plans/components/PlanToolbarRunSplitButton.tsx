import {
  Button,
  ButtonGroup,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CalendarClock, ChevronDown, PlayCircle, XCircle } from 'lucide-react';
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import {
  PLAN_RUN_CANCEL_SCHEDULED_COPY,
  PLAN_TOOLBAR_COPY,
} from '~/routing/plans/data/data.copy';
import type { PlanRunDialogMode } from '~/routing/plans/types';
import { isPlanRunBranchMissing } from '~/routing/plans/utils/plan-run-dialog';
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
  /** @description The soonest SCHEDULED run's fire time; non-null gates every run-now path. */
  readonly scheduledRunAt?: Date | string | null;
  /** @description Id of that same scheduled run; non-null adds "Cancel scheduled run" to the caret menu. */
  readonly scheduledRunId?: string | null;
  readonly workflowRunBlocked: boolean;
  readonly workflowRunBlockedReason?: string;
  readonly workingDirectory?: string;
}

/**
 * @description The toolbar's Run control as a split button. The primary half keeps the
 * one-click submit (a `runPlan` form with the hidden `ralphTuning`), tooltip and all; the
 * caret half is a dropdown that opens the Run dialog on its Run or Schedule tab. The caret
 * sits OUTSIDE the form, so it can never submit it; the form wraps only the primary button.
 * A scheduled run disables both run-now paths (they enqueue immediately); Schedule stays
 * available unless the plan is terminal.
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
    scheduledRunAt,
    scheduledRunId,
    workflowRunBlocked,
    workflowRunBlockedReason,
    workingDirectory,
  } = props;

  // Hooks

  // Setup
  // Branch is a REQUIRED enqueue input; with it blank the run would fail fast at
  // the server boundary, so gate the Run control and surface the reason.
  const branchMissing = isPlanRunBranchMissing(branch);
  const isScheduled = scheduledRunAt != null;
  const canCancelScheduled = scheduledRunId != null;
  const isSubmitting = fetcherRunPlan.state !== 'idle';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <ButtonGroup data-testid="PlanToolbarRunSplitButton">
      <Tooltip delayDuration={1_000}>
        <TooltipTrigger asChild={true}>
          <fetcherRunPlan.Form method="post">
            <Input name="intent" type="hidden" value="runPlan" />
            <Input name="ralphTuning" type="hidden" value={ralphTuningJson} />
            {branch != null && branch !== '' && (
              <Input name="branch" type="hidden" value={branch} />
            )}
            {jobRunHooksJson !== '' && (
              <Input
                name="jobRunHooksJson"
                type="hidden"
                value={jobRunHooksJson}
              />
            )}
            {workingDirectory != null && workingDirectory !== '' && (
              <Input
                name="workingDirectory"
                type="hidden"
                value={workingDirectory}
              />
            )}
            {checkoutId != null && checkoutId !== '' && (
              <Input name="checkoutId" type="hidden" value={checkoutId} />
            )}
            {repositoryId != null && repositoryId !== '' && (
              <Input name="repositoryId" type="hidden" value={repositoryId} />
            )}
            <Button
              className="rounded-r-none"
              disabled={
                isSubmitting ||
                workflowRunBlocked ||
                branchMissing ||
                isRunning ||
                isTerminal ||
                isScheduled
              }
              size="xs"
              type="submit"
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
            disabled={isTerminal && !canCancelScheduled}
            size="xs"
            type="button"
            variant="ghost"
          >
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isRunning || isScheduled || isTerminal}
            onSelect={() => onOpenDialog('run')}
          >
            <PlayCircle />
            {PLAN_TOOLBAR_COPY.runWithOptionsLabel}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isTerminal}
            onSelect={() => onOpenDialog('schedule')}
          >
            <CalendarClock />
            {PLAN_TOOLBAR_COPY.scheduleLabel}
          </DropdownMenuItem>
          {canCancelScheduled && (
            <DropdownMenuItem onSelect={onOpenCancelScheduled}>
              <XCircle />
              {PLAN_RUN_CANCEL_SCHEDULED_COPY.menuItemLabel}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
};
