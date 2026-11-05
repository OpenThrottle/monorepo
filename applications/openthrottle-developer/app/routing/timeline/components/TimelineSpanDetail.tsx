import {
  Button,
  SheetHeader,
  SheetTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { TIMELINE_SPAN_KIND_LABEL } from '~/routing/timeline/config/kinds';
import {
  TIMELINE_DETAIL_COPY,
  TIMELINE_SPAN_TOOLTIP_COPY,
} from '~/routing/timeline/data/data.copy';
import type { TimelineSpan } from '~/routing/timeline/types';
import {
  formatTimelineDuration,
  formatTimelineTimestamp,
} from '~/routing/timeline/utils/formatters';

import { TimelineDetailRow } from './TimelineDetailRow';

export interface TimelineSpanDetailProps {
  readonly span: TimelineSpan;
}

/** @description Detail sheet body for one selected span. */
export const TimelineSpanDetail = (
  props: TimelineSpanDetailProps,
): React.ReactElement => {
  const { span } = props;

  // Hooks

  // Setup
  const duration =
    new Date(span.endsAt).getTime() - new Date(span.startsAt).getTime();

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
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
      {span.status != null && (
        <TimelineDetailRow
          label={TIMELINE_DETAIL_COPY.statusLabel}
          value={span.status}
        />
      )}
      {span.backend != null && (
        <TimelineDetailRow
          label={TIMELINE_DETAIL_COPY.backendLabel}
          value={span.backend}
        />
      )}
      {span.model != null && (
        <TimelineDetailRow
          label={TIMELINE_DETAIL_COPY.modelLabel}
          value={span.model}
        />
      )}
      {/* The disclosure follows the value it qualifies, not a footnote
          somewhere else — a derived duration must never be read alone. */}
      {span.derivedEnd && (
        <p
          className="text-muted-foreground mt-3 text-xs"
          data-testid="TimelineDetailPopoverDerived"
        >
          {TIMELINE_SPAN_TOOLTIP_COPY.derivedEnd}
        </p>
      )}
      {span.planId != null && (
        <Button asChild={true} className="mt-4 w-full" variant="outline">
          <Link to={`/plans/${span.planId}`}>
            {TIMELINE_DETAIL_COPY.openPlan}
          </Link>
        </Button>
      )}
    </div>
  );
};
