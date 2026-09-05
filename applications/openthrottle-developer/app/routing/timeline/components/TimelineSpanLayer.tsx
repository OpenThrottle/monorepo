import * as React from 'react';
import { spanRect } from '~/routing/timeline/utils/span-geometry';
import {
  TIMELINE_DERIVED_PATTERN_ID,
  TimelineSpanBar,
} from './TimelineSpanBar';
import { TIMELINE_LANE_ROW_HEIGHT } from '~/routing/timeline/config/layout';
import type { TimelineLane, TimelineSpan } from '~/routing/timeline/types';
import type { TimelineScale } from '~/routing/timeline/utils/scale';

export interface TimelineSpanLayerProps {
  readonly lane: TimelineLane;
  readonly onSelectSpan?: (span: TimelineSpan) => void;
  readonly scale: TimelineScale;
}

export const TimelineSpanLayer = (
  props: TimelineSpanLayerProps,
): React.ReactElement => {
  const { lane, onSelectSpan, scale } = props;

  // Hooks

  // Setup
  const height = lane.subRowCount * TIMELINE_LANE_ROW_HEIGHT;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <svg
      className="absolute top-0 left-0"
      data-testid="TimelineSpanLayer"
      height={height}
      width={scale.width}
    >
      <defs>
        <pattern
          height={6}
          id={TIMELINE_DERIVED_PATTERN_ID}
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
          width={6}
        >
          <line
            className="stroke-background"
            strokeWidth={2}
            x1={0}
            x2={0}
            y1={0}
            y2={6}
          />
        </pattern>
      </defs>
      {lane.spans.map((placed) => (
        <TimelineSpanBar
          key={placed.span.id}
          onSelect={onSelectSpan}
          rect={spanRect({
            scale,
            span: placed.span,
            subRow: placed.subRow,
          })}
          span={placed.span}
        />
      ))}
    </svg>
  );
};
