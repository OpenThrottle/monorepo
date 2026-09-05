import * as React from 'react';
import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CheckCircle } from 'lucide-react';
import type { useFetcher } from 'react-router';
import type { action } from '~/routes/plans.$planId._index';
import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface PlanToolbarStatusActionProps {
  readonly fetcherSetPlanStatus: ReturnType<typeof useFetcher<typeof action>>;
  readonly isCompleted: boolean;
  readonly isRunning: boolean;
  readonly planId: string;
}

/**
 * @description The {@link PlanToolbar} Mark Complete control: submits the
 * route's `setPlanStatus` intent via the toolbar's fetcher, gated on completed
 * / running. Extracted from the toolbar per component-primitive-shape R6.
 */
export const PlanToolbarStatusAction = (
  props: PlanToolbarStatusActionProps,
): React.ReactElement => {
  const { fetcherSetPlanStatus, isCompleted, isRunning, planId } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tooltip delayDuration={1_000}>
      <TooltipTrigger asChild={true}>
        <fetcherSetPlanStatus.Form method="post">
          <Input name="intent" type="hidden" value="setPlanStatus" />
          <Input name="planId" type="hidden" value={planId} />
          <Input name="status" type="hidden" value="COMPLETED" />
          <Button
            disabled={
              fetcherSetPlanStatus.state !== 'idle' || isCompleted || isRunning
            }
            size="xs"
            type="submit"
            variant="ghost"
          >
            <CheckCircle />
            {fetcherSetPlanStatus.state !== 'idle'
              ? 'Marking…'
              : 'Mark Complete'}
          </Button>
        </fetcherSetPlanStatus.Form>
      </TooltipTrigger>
      <TooltipContent side="top">
        {isCompleted
          ? 'Plan is already completed'
          : isRunning
            ? PLAN_TOOLBAR_COPY.markCompleteRunningTooltip
            : 'Mark this plan as completed'}
      </TooltipContent>
    </Tooltip>
  );
};
