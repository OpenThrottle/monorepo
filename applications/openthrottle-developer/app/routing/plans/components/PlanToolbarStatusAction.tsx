import {
  Button,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CheckCircle } from 'lucide-react';
import * as React from 'react';
import type { useFetcher } from 'react-router';

import type { action } from '~/routes/plans.$planId._index';
import { getPlanMarkCompleteTooltip } from '~/routing/plans/utils/plan-mark-complete-tooltip';

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
  const isSubmitting = fetcherSetPlanStatus.state !== 'idle';
  const submitLabel = isSubmitting ? 'Marking…' : 'Mark Complete';

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
            disabled={isSubmitting || isCompleted || isRunning}
            size="xs"
            type="submit"
            variant="ghost"
          >
            <CheckCircle />
            {submitLabel}
          </Button>
        </fetcherSetPlanStatus.Form>
      </TooltipTrigger>
      <TooltipContent side="top">
        {getPlanMarkCompleteTooltip({ isCompleted, isRunning })}
      </TooltipContent>
    </Tooltip>
  );
};
