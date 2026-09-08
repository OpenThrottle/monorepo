import * as React from 'react';
import clsx from 'clsx';
import {
  formatTimelineTick,
  timelineZoneLabel,
} from '~/routing/timeline/utils/formatters';
import { buildTimelineTicks, nowLineX } from '~/routing/timeline/utils/scale';
import type { TimelineScale } from '~/routing/timeline/utils/scale';

export interface TimelineAxisProps {
  readonly className?: string;
  /**
   * TRUE when the window tracks the present (its end is "now"), which pins the
   * now line to the right edge rather than dropping it the moment the clock
   * passes the window end — which is immediately, since the loader stamps the
   * end at request time.
   */
  readonly isLiveWindow?: boolean;
  /** Height of the tick rules drawn down over the lanes; 0 draws labels only. */
  readonly ruleHeight?: number;
  readonly scale: TimelineScale;
}

const AXIS_HEIGHT = 28;

export const TimelineAxis = (props: TimelineAxisProps): React.ReactElement => {
  const { className, isLiveWindow = false, ruleHeight = 0, scale } = props;

  // Hooks

  // Setup
  const ticks = buildTimelineTicks(scale);
  const nowX = nowLineX(scale, Date.now(), { clampPast: isLiveWindow });
  const zone = timelineZoneLabel();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <svg
      aria-label={`Time axis, times shown in ${zone}`}
      className={clsx('block', className)}
      data-testid="TimelineAxis"
      height={AXIS_HEIGHT + ruleHeight}
      role="img"
      width={scale.width}
    >
      <line
        className="stroke-border"
        strokeWidth={1}
        x1={0}
        x2={scale.width}
        y1={AXIS_HEIGHT - 0.5}
        y2={AXIS_HEIGHT - 0.5}
      />
      {ticks.map((tick) => (
        <g data-testid="TimelineAxisTick" key={tick.at}>
          <text
            className="fill-muted-foreground text-[10px]"
            textAnchor="middle"
            x={tick.x}
            y={14}
          >
            {formatTimelineTick(tick.at, tick.scale)}
          </text>
          <line
            className="stroke-border/60"
            strokeWidth={1}
            x1={tick.x}
            x2={tick.x}
            y1={AXIS_HEIGHT}
            y2={AXIS_HEIGHT + ruleHeight}
          />
        </g>
      ))}
      {nowX != null ? (
        <line
          className="stroke-rose-500"
          data-testid="TimelineAxisNowLine"
          strokeWidth={1}
          x1={nowX}
          x2={nowX}
          y1={AXIS_HEIGHT - 6}
          y2={AXIS_HEIGHT + ruleHeight}
        />
      ) : null}
    </svg>
  );
};
