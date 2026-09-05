import * as React from 'react';
import clsx from 'clsx';
import { buildTimelineLanes } from '~/routing/timeline/utils/lanes';
import { createTimelineScale } from '~/routing/timeline/utils/scale';
import { TIMELINE_LANE_ROW_HEIGHT } from '~/routing/timeline/config/layout';
import { TimelineAxis } from './TimelineAxis';
import { TimelineLaneGutter } from './TimelineLaneGutter';
import { TimelineMarkerLayer } from './TimelineMarkerLayer';
import { TimelineSpanLayer } from './TimelineSpanLayer';
import { useTimelinePan } from '~/routing/timeline/hooks/useTimelinePan';
import { useTimelineWidth } from '~/routing/timeline/hooks/useTimelineWidth';
import type {
  TimelineLane,
  TimelineMarker,
  TimelineMarkerCluster,
  TimelineSpan,
} from '~/routing/timeline/types';
import type { TimelineScale } from '~/routing/timeline/utils/scale';

export interface TimelineChartProps {
  readonly className?: string;
  /** Passed through to the axis; true when the window's end is "now". */
  readonly isLiveWindow?: boolean;
  readonly markers: readonly TimelineMarker[];
  readonly onSelectMarkerCluster?: (cluster: TimelineMarkerCluster) => void;
  readonly onSelectSpan?: (span: TimelineSpan) => void;
  /** Drawn over each lane's plot area, on top of the span layer. */
  readonly renderLane?: (args: {
    readonly lane: TimelineLane;
    readonly scale: TimelineScale;
  }) => React.ReactNode;
  readonly spans: readonly TimelineSpan[];
  readonly windowFromIso: string;
  readonly windowToIso: string;
}

const AXIS_HEIGHT = 28;
const GUTTER_WIDTH = 176;

export const TimelineChart = (
  props: TimelineChartProps,
): React.ReactElement => {
  const {
    className,
    isLiveWindow,
    markers,
    onSelectMarkerCluster,
    onSelectSpan,
    renderLane,
    spans,
    windowFromIso,
    windowToIso,
  } = props;

  // Hooks
  const { ref: bodyRef, width } = useTimelineWidth();
  const pan = useTimelinePan();

  // Setup
  const plotWidth = Math.max(0, width - GUTTER_WIDTH);
  // The chart owns the scale, so it also owns lane assembly — marker
  // clustering is a function of pixels, and nothing above this component
  // knows how wide the plot area turned out to be.
  const scale = createTimelineScale({
    from: windowFromIso,
    to: windowToIso,
    width: plotWidth,
  });
  const lanes = buildTimelineLanes({ markers, scale, spans });
  const totalHeight = lanes.reduce(
    (sum, lane) => sum + lane.subRowCount * TIMELINE_LANE_ROW_HEIGHT,
    0,
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('w-full', className)} data-testid="TimelineChart">
      <div className="flex w-full" ref={bodyRef}>
        <TimelineLaneGutter
          laneRowHeight={TIMELINE_LANE_ROW_HEIGHT}
          lanes={lanes}
          offsetTop={AXIS_HEIGHT}
          style={{ width: GUTTER_WIDTH }}
        />
        {/*
          Overflow is owned by this container, never by the page: the body may
          scroll sideways, the document must not. tabIndex makes the chart
          reachable without a pointer, and the pan hook moves scrollLeft rather
          than transforming, so native scrolling is never trapped.
        */}
        <div
          aria-label="Workstream timeline chart"
          className={clsx(
            'focus-visible:ring-ring flex-1 overflow-x-auto focus-visible:ring-2 focus-visible:outline-none',
            pan.isPanning ? 'cursor-grabbing select-none' : 'cursor-grab',
          )}
          data-testid="TimelineChartBody"
          onKeyDown={pan.onKeyDown}
          onPointerDown={pan.onPointerDown}
          onPointerMove={pan.onPointerMove}
          onPointerUp={pan.onPointerUp}
          ref={pan.ref}
          role="group"
          tabIndex={0}
        >
          <TimelineAxis
            isLiveWindow={isLiveWindow}
            ruleHeight={totalHeight}
            scale={scale}
          />
          <div className="relative" style={{ marginTop: -totalHeight }}>
            {lanes.map((lane) => (
              <div
                className="relative border-b"
                data-testid="TimelineChartLane"
                key={lane.key}
                style={{
                  height: lane.subRowCount * TIMELINE_LANE_ROW_HEIGHT,
                  width: plotWidth,
                }}
              >
                <TimelineSpanLayer
                  lane={lane}
                  onSelectSpan={onSelectSpan}
                  scale={scale}
                />
                <TimelineMarkerLayer
                  lane={lane}
                  onSelectCluster={onSelectMarkerCluster}
                  scale={scale}
                />
                {renderLane?.({ lane, scale })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
