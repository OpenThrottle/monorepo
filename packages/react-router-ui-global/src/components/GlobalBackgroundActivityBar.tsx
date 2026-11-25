import { cn, Progress } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { GLOBAL_BACKGROUND_ACTIVITY_COPY } from '../data/copy';
import type { GlobalBackgroundActivity } from '../utils/background-activity';
import { summarizeBackgroundActivities } from '../utils/background-activity';
import { GlobalBackgroundActivityTooltip } from './GlobalBackgroundActivityTooltip';

export interface GlobalBackgroundActivityBarProps {
  readonly activities: readonly GlobalBackgroundActivity[];
  /** Where the bar links: the server health page. */
  readonly href: string;
}

export const GlobalBackgroundActivityBar = (
  props: GlobalBackgroundActivityBarProps,
): React.ReactElement => {
  const { activities, href } = props;

  // Hooks

  // Setup
  const { percent } = summarizeBackgroundActivities(activities);
  const isIndeterminate = percent === null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalBackgroundActivityTooltip activities={activities} side="top">
      <Link
        aria-label={GLOBAL_BACKGROUND_ACTIVITY_COPY.label}
        className="block w-full py-1"
        data-testid="GlobalBackgroundActivityBar"
        rel="noopener noreferrer"
        target="_blank"
        to={href}
      >
        <Progress
          aria-label={GLOBAL_BACKGROUND_ACTIVITY_COPY.label}
          className={cn(
            'h-1',
            isIndeterminate && 'bg-primary/40 animate-pulse',
          )}
          value={percent ?? undefined}
        />
      </Link>
    </GlobalBackgroundActivityTooltip>
  );
};
