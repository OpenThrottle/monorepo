import {
  DropdownMenuItem,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import { CalendarClock } from 'lucide-react';
import * as React from 'react';

import { PLAN_TOOLBAR_COPY } from '~/routing/plans/data/data.copy';

export interface PlanToolbarScheduleMenuItemProps {
  /** @description Why the plan cannot be scheduled (D2), or `null` when it can. Shown as a tooltip. */
  readonly disabledReason: string | null;
  /** @description True when the plan already has a scheduled run: the item reads "Reschedule…". */
  readonly isRescheduling: boolean;
  readonly onSelect: () => void;
}

/**
 * @description The Run caret menu's Schedule item. A plan that cannot succeed at scheduling
 * (BLOCKED, active or terminal) keeps the item but disables it, with the reason in a tooltip, so
 * the control never offers an action the server will reject. A scheduled plan reads "Reschedule…".
 */
export const PlanToolbarScheduleMenuItem = (
  props: PlanToolbarScheduleMenuItemProps,
): React.ReactElement => {
  const { disabledReason, isRescheduling, onSelect } = props;

  // Hooks

  // Setup
  const label = isRescheduling
    ? PLAN_TOOLBAR_COPY.rescheduleLabel
    : PLAN_TOOLBAR_COPY.scheduleLabel;

  // Handlers

  // Markup
  const item = (
    <DropdownMenuItem disabled={disabledReason !== null} onSelect={onSelect}>
      <CalendarClock />
      {label}
    </DropdownMenuItem>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (disabledReason === null) {
    return item;
  }

  // A disabled item swallows pointer events, so the tooltip hangs off its wrapper.
  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>
        <span className="block" data-testid="PlanToolbarScheduleMenuItem">
          {item}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs" side="left">
        {disabledReason}
      </TooltipContent>
    </Tooltip>
  );
};
