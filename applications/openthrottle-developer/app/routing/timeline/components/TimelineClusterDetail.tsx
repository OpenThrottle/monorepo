import { SheetHeader, SheetTitle } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { TIMELINE_MARKER_KIND_LABEL } from '~/routing/timeline/config/kinds';
import { TIMELINE_DETAIL_COPY } from '~/routing/timeline/data/data.copy';
import type { TimelineMarkerCluster } from '~/routing/timeline/types';
import { formatTimelineTimestamp } from '~/routing/timeline/utils/formatters';

export interface TimelineClusterDetailProps {
  readonly cluster: TimelineMarkerCluster;
}

/** @description Detail sheet body listing every member of a marker cluster. */
export const TimelineClusterDetail = (
  props: TimelineClusterDetailProps,
): React.ReactElement => {
  const { cluster } = props;

  // Hooks

  // Setup
  const isCluster = cluster.markers.length > 1;
  const kindLabel = TIMELINE_MARKER_KIND_LABEL[cluster.kind];
  const clusterTitle = `${cluster.markers.length} × ${kindLabel}`;
  const title = isCluster ? clusterTitle : kindLabel;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="p-4">
      <SheetHeader className="px-0">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      {/* A cluster expands to its members here — that is the whole point
          of collapsing them in the chart. */}
      <ul className="mt-2 space-y-3">
        {cluster.markers.map((marker) => (
          <li
            className="border-b pb-2 text-sm last:border-b-0"
            data-testid="TimelineDetailPopoverMarker"
            key={marker.id}
          >
            <p className="font-medium">{marker.title}</p>
            <p className="text-muted-foreground text-xs">
              {formatTimelineTimestamp(marker.at)}
            </p>
            {marker.url != null && (
              <a
                className="text-xs underline"
                href={marker.url}
                rel="noreferrer"
                target="_blank"
              >
                {TIMELINE_DETAIL_COPY.openPullRequest}
              </a>
            )}
            {marker.url == null && marker.planId != null && (
              <Link
                className="text-xs underline"
                to={`/plans/${marker.planId}`}
              >
                {TIMELINE_DETAIL_COPY.openPlan}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
