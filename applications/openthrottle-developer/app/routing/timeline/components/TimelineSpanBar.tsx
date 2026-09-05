import * as React from 'react';
import clsx from 'clsx';
import {
  TIMELINE_SPAN_FILL_CLASS,
  TIMELINE_SPAN_KIND_LABEL,
} from '~/routing/timeline/config/kinds';
import { TIMELINE_SPAN_TOOLTIP_COPY } from '~/routing/timeline/data/data.copy';
import {
  formatTimelineDuration,
  formatTimelineTimestamp,
} from '~/routing/timeline/utils/formatters';
import { spanStatusOpacity } from '~/routing/timeline/utils/span-geometry';
import type { TimelineSpan } from '~/routing/timeline/types';
import type { TimelineSpanRect } from '~/routing/timeline/utils/span-geometry';

export interface TimelineSpanBarProps {
  readonly onSelect?: (span: TimelineSpan) => void;
  readonly rect: TimelineSpanRect;
  readonly span: TimelineSpan;
}

/** Hatch pattern id for derived ends; one definition serves every bar. */
export const TIMELINE_DERIVED_PATTERN_ID = 'timeline-derived-hatch';

const EDGE_MARKER_WIDTH = 2;

export const TimelineSpanBar = (
  props: TimelineSpanBarProps,
): React.ReactElement => {
  const { onSelect, rect, span } = props;

  // Hooks

  // Setup
  const duration =
    new Date(span.endsAt).getTime() - new Date(span.startsAt).getTime();

  const tooltip = [
    `${TIMELINE_SPAN_KIND_LABEL[span.kind]}: ${span.title}`,
    `${formatTimelineTimestamp(span.startsAt)} → ${formatTimelineTimestamp(span.endsAt)} (${formatTimelineDuration(duration)})`,
    span.model != null ? `Model: ${span.model}` : null,
    span.status != null ? `Status: ${span.status}` : null,
    span.derivedEnd ? TIMELINE_SPAN_TOOLTIP_COPY.derivedEnd : null,
    rect.clippedStart ? TIMELINE_SPAN_TOOLTIP_COPY.clippedStart : null,
    rect.clippedEnd ? TIMELINE_SPAN_TOOLTIP_COPY.clippedEnd : null,
    rect.widened ? TIMELINE_SPAN_TOOLTIP_COPY.widened : null,
  ]
    .filter((line) => line != null)
    .join('\n');

  // Handlers
  const handleSelect = (): void => {
    onSelect?.(span);
  };

  const handleKeyDown: React.KeyboardEventHandler<SVGGElement> = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    handleSelect();
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <g
      aria-label={tooltip}
      data-derived={span.derivedEnd}
      data-testid="TimelineSpanBar"
      data-widened={rect.widened}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <title>{tooltip}</title>
      <rect
        className={clsx('rounded-sm', TIMELINE_SPAN_FILL_CLASS[span.kind])}
        height={rect.height}
        opacity={spanStatusOpacity(span.status)}
        rx={2}
        width={rect.width}
        x={rect.x}
        y={rect.y}
      />
      {/*
        A derived end is hatched rather than solid. Without it a queued-at →
        last-activity bar is visually indistinguishable from a measured run,
        which is the single most misleading thing this chart could do.
      */}
      {span.derivedEnd ? (
        <rect
          data-testid="TimelineSpanBarDerivedEnd"
          fill={`url(#${TIMELINE_DERIVED_PATTERN_ID})`}
          height={rect.height}
          rx={2}
          width={Math.min(rect.width, 12)}
          x={rect.x + rect.width - Math.min(rect.width, 12)}
          y={rect.y}
        />
      ) : null}
      {/* Clipped ends get a solid rule, so a cut span never looks finished. */}
      {rect.clippedStart ? (
        <rect
          className="fill-foreground"
          data-testid="TimelineSpanBarClipStart"
          height={rect.height}
          width={EDGE_MARKER_WIDTH}
          x={rect.x}
          y={rect.y}
        />
      ) : null}
      {rect.clippedEnd ? (
        <rect
          className="fill-foreground"
          data-testid="TimelineSpanBarClipEnd"
          height={rect.height}
          width={EDGE_MARKER_WIDTH}
          x={rect.x + rect.width - EDGE_MARKER_WIDTH}
          y={rect.y}
        />
      ) : null}
    </g>
  );
};
