import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { GlobalBackgroundActivity } from '../utils/background-activity';
import { describeBackgroundActivity } from '../utils/background-activity';

export interface GlobalBackgroundActivityTooltipProps {
  readonly activities: readonly GlobalBackgroundActivity[];
  /** The trigger: the footer's bar, or its status dot inside the ring. */
  readonly children: React.ReactElement;
  readonly side: 'right' | 'top';
}

export const GlobalBackgroundActivityTooltip = (
  props: GlobalBackgroundActivityTooltipProps,
): React.ReactElement => {
  const { activities, children, side } = props;

  // Hooks

  // Setup
  // Rendered only while hovered (portal), so the elapsed time never reaches SSR.
  const now = Date.now();
  const lines = activities.map((activity) => {
    return describeBackgroundActivity(activity, now);
  });

  // Handlers

  // Markup
  const listMarkup = (
    <ul
      className="flex flex-col gap-1.5"
      data-testid="GlobalBackgroundActivityTooltip"
    >
      {lines.map((line) => {
        return (
          <li key={line.id}>
            <p className="font-medium">{line.label}</p>
            <p className="tabular-nums opacity-80">{line.detail}</p>
          </li>
        );
      })}
    </ul>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Tooltip>
      <TooltipTrigger asChild={true}>{children}</TooltipTrigger>
      <TooltipContent className="text-left text-pretty" side={side}>
        {listMarkup}
      </TooltipContent>
    </Tooltip>
  );
};
