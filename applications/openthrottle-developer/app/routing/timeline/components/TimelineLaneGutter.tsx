import * as React from 'react';
import clsx from 'clsx';
import type { TimelineLane } from '~/routing/timeline/types';

export interface TimelineLaneGutterProps {
  readonly className?: string;
  /** Pixel height of a single sub-row; a lane is this times its sub-row count. */
  readonly laneRowHeight: number;
  readonly lanes: readonly TimelineLane[];
  /** Vertical offset matching the axis, so labels line up with their lanes. */
  readonly offsetTop: number;
  readonly style?: React.CSSProperties;
}

export const TimelineLaneGutter = (
  props: TimelineLaneGutterProps,
): React.ReactElement => {
  const { className, laneRowHeight, lanes, offsetTop, style } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        // Sticky rather than fixed: the labels stay put while the chart body
        // scrolls horizontally, but still scroll away vertically with the page.
        'bg-background sticky left-0 z-10 shrink-0 border-r',
        className,
      )}
      data-testid="TimelineLaneGutter"
      style={style}
    >
      <div style={{ height: offsetTop }} />
      {lanes.map((lane) => (
        <div
          className="text-muted-foreground flex items-center truncate border-b px-3 text-xs"
          data-testid="TimelineLaneGutterLane"
          key={lane.key}
          style={{ height: lane.subRowCount * laneRowHeight }}
          title={lane.label}
        >
          {lane.label}
        </div>
      ))}
    </div>
  );
};
