import * as React from 'react';

export interface RunningIndicatorProps {}

/** Subtle in-progress affordance shown until the turn's terminal event lands. */
export const RunningIndicator = (
  _props: RunningIndicatorProps,
): React.ReactElement => {
  // const { } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <p
      aria-live="polite"
      className="text-muted-foreground flex items-center gap-1.5 text-xs"
      data-testid="ChatTurnTimeline-running"
      role="status"
    >
      <span
        aria-hidden="true"
        className="bg-muted-foreground/60 h-1.5 w-1.5 animate-pulse rounded-full motion-reduce:animate-none"
      />
      Working…
    </p>
  );
};
