import * as React from 'react';
import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { TimelineDetailRow } from './TimelineDetailRow';
import {
  TIMELINE_MARKER_KIND_LABEL,
  TIMELINE_SPAN_KIND_LABEL,
} from '~/routing/timeline/config/kinds';
import {
  TIMELINE_DETAIL_COPY,
  TIMELINE_SPAN_TOOLTIP_COPY,
} from '~/routing/timeline/data/data.copy';
import {
  formatTimelineDuration,
  formatTimelineTimestamp,
} from '~/routing/timeline/utils/formatters';
import type {
  TimelineMarkerCluster,
  TimelineSpan,
} from '~/routing/timeline/types';

export interface TimelineDetailPopoverProps {
  readonly cluster: TimelineMarkerCluster | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly span: TimelineSpan | null;
}

export const TimelineDetailPopover = (
  props: TimelineDetailPopoverProps,
): React.ReactElement => {
  const { cluster, onOpenChange, span } = props;

  // Hooks

  // Setup
  const isOpen = span != null || cluster != null;
  const duration =
    span != null
      ? new Date(span.endsAt).getTime() - new Date(span.startsAt).getTime()
      : 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Sheet onOpenChange={onOpenChange} open={isOpen}>
      <SheetContent data-testid="TimelineDetailPopover" side="right">
        {span != null ? (
          <div className="p-4">
            <SheetHeader className="px-0">
              <SheetTitle>{span.title}</SheetTitle>
            </SheetHeader>
            <p className="text-muted-foreground mb-3 text-xs">
              {TIMELINE_SPAN_KIND_LABEL[span.kind]}
            </p>
            <TimelineDetailRow
              label={TIMELINE_DETAIL_COPY.startedLabel}
              value={formatTimelineTimestamp(span.startsAt)}
            />
            <TimelineDetailRow
              label={TIMELINE_DETAIL_COPY.endedLabel}
              value={formatTimelineTimestamp(span.endsAt)}
            />
            <TimelineDetailRow
              label={TIMELINE_DETAIL_COPY.durationLabel}
              value={formatTimelineDuration(duration)}
            />
            {span.status != null ? (
              <TimelineDetailRow
                label={TIMELINE_DETAIL_COPY.statusLabel}
                value={span.status}
              />
            ) : null}
            {span.backend != null ? (
              <TimelineDetailRow
                label={TIMELINE_DETAIL_COPY.backendLabel}
                value={span.backend}
              />
            ) : null}
            {span.model != null ? (
              <TimelineDetailRow
                label={TIMELINE_DETAIL_COPY.modelLabel}
                value={span.model}
              />
            ) : null}
            {/* The disclosure follows the value it qualifies, not a footnote
                somewhere else — a derived duration must never be read alone. */}
            {span.derivedEnd ? (
              <p
                className="text-muted-foreground mt-3 text-xs"
                data-testid="TimelineDetailPopoverDerived"
              >
                {TIMELINE_SPAN_TOOLTIP_COPY.derivedEnd}
              </p>
            ) : null}
            {span.planId != null ? (
              <Button asChild={true} className="mt-4 w-full" variant="outline">
                <Link to={`/plans/${span.planId}`}>
                  {TIMELINE_DETAIL_COPY.openPlan}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}

        {cluster != null ? (
          <div className="p-4">
            <SheetHeader className="px-0">
              <SheetTitle>
                {cluster.markers.length > 1
                  ? `${cluster.markers.length} × ${TIMELINE_MARKER_KIND_LABEL[cluster.kind]}`
                  : TIMELINE_MARKER_KIND_LABEL[cluster.kind]}
              </SheetTitle>
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
                  {marker.url != null ? (
                    <a
                      className="text-xs underline"
                      href={marker.url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {TIMELINE_DETAIL_COPY.openPullRequest}
                    </a>
                  ) : null}
                  {marker.url == null && marker.planId != null ? (
                    <Link
                      className="text-xs underline"
                      to={`/plans/${marker.planId}`}
                    >
                      {TIMELINE_DETAIL_COPY.openPlan}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
