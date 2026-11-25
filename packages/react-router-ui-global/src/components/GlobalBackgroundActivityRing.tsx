import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { GLOBAL_BACKGROUND_ACTIVITY_COPY } from '../data/copy';
import type { GlobalBackgroundActivity } from '../utils/background-activity';
import { summarizeBackgroundActivities } from '../utils/background-activity';
import { GlobalBackgroundActivityTooltip } from './GlobalBackgroundActivityTooltip';

export interface GlobalBackgroundActivityRingProps {
  readonly activities: readonly GlobalBackgroundActivity[];
  /** The status dot the ring draws around. */
  readonly children: React.ReactNode;
}

export const GlobalBackgroundActivityRing = (
  props: GlobalBackgroundActivityRingProps,
): React.ReactElement => {
  const { activities, children } = props;

  // Hooks

  // Setup
  const { percent } = summarizeBackgroundActivities(activities);
  const isIndeterminate = percent === null;
  const radius = 6.5;
  const circumference = 2 * Math.PI * radius;
  // Indeterminate spins a quarter arc; otherwise the arc is the share done.
  const filled = isIndeterminate ? 0.25 : percent / 100;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalBackgroundActivityTooltip activities={activities} side="right">
      <span
        aria-label={GLOBAL_BACKGROUND_ACTIVITY_COPY.label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent ?? undefined}
        className="relative flex size-4 shrink-0 items-center justify-center"
        data-testid="GlobalBackgroundActivityRing"
        role="progressbar"
      >
        <svg
          aria-hidden={true}
          className={cn(
            'absolute inset-0 size-4 -rotate-90',
            isIndeterminate && 'animate-spin',
          )}
          viewBox="0 0 16 16"
        >
          <circle
            className="stroke-primary/20"
            cx={8}
            cy={8}
            fill="none"
            r={radius}
            strokeWidth={1.5}
          />
          <circle
            className="stroke-primary transition-[stroke-dashoffset]"
            cx={8}
            cy={8}
            fill="none"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - filled)}
            strokeLinecap="round"
            strokeWidth={1.5}
          />
        </svg>
        {children}
      </span>
    </GlobalBackgroundActivityTooltip>
  );
};
