import * as React from 'react';
import {
  TIMELINE_LANE_ROW_HEIGHT,
  TIMELINE_MARKER_SIZE,
} from '~/routing/timeline/config/layout';
import { TIMELINE_MARKER_KIND_LABEL } from '~/routing/timeline/config/kinds';
import { formatTimelineTimestamp } from '~/routing/timeline/utils/formatters';
import { TimelineMarkerGlyph } from './TimelineMarkerGlyph';
import type {
  TimelineLane,
  TimelineMarkerCluster,
} from '~/routing/timeline/types';
import type { TimelineScale } from '~/routing/timeline/utils/scale';

export interface TimelineMarkerLayerProps {
  readonly lane: TimelineLane;
  readonly onSelectCluster?: (cluster: TimelineMarkerCluster) => void;
  readonly scale: TimelineScale;
}

/** Markers sit on the lane baseline, below the span bars. */
const BASELINE_INSET = 6;

export const TimelineMarkerLayer = (
  props: TimelineMarkerLayerProps,
): React.ReactElement => {
  const { lane, onSelectCluster, scale } = props;

  // Hooks

  // Setup
  const height = lane.subRowCount * TIMELINE_LANE_ROW_HEIGHT;
  const baselineY = height - BASELINE_INSET;
  const radius = TIMELINE_MARKER_SIZE / 2;

  // Handlers
  const clusterLabel = (cluster: TimelineMarkerCluster): string => {
    const kindLabel = TIMELINE_MARKER_KIND_LABEL[cluster.kind];
    const when = formatTimelineTimestamp(cluster.at);
    const first = cluster.markers[0];

    if (cluster.markers.length > 1) {
      return `${cluster.markers.length} × ${kindLabel} around ${when}`;
    }

    return `${kindLabel}: ${first?.title ?? ''} — ${when}`;
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0"
      data-testid="TimelineMarkerLayer"
      height={height}
      width={scale.width}
    >
      {lane.markerClusters.map((cluster) => {
        const label = clusterLabel(cluster);

        return (
          <g
            aria-label={label}
            className="pointer-events-auto cursor-pointer"
            data-testid="TimelineMarkerCluster"
            key={`${cluster.kind}-${cluster.at}-${cluster.markers[0]?.id ?? ''}`}
            onClick={() => onSelectCluster?.(cluster)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;

              event.preventDefault();
              onSelectCluster?.(cluster);
            }}
            role="button"
            tabIndex={0}
          >
            <title>{label}</title>
            <TimelineMarkerGlyph
              count={cluster.markers.length}
              kind={cluster.kind}
              radius={radius}
              x={scale.x(cluster.at)}
              y={baselineY}
            />
          </g>
        );
      })}
    </svg>
  );
};
