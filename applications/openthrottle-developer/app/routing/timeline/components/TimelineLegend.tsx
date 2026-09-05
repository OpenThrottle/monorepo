import * as React from 'react';
import {
  TIMELINE_MARKER_KIND_LABEL,
  TIMELINE_MARKER_KINDS,
  TIMELINE_SPAN_FILL_CLASS,
  TIMELINE_SPAN_KIND_LABEL,
  TIMELINE_SPAN_KINDS,
} from '~/routing/timeline/config/kinds';
import {
  TIMELINE_DISCLOSURE_COPY,
  TIMELINE_LEGEND_COPY,
} from '~/routing/timeline/data/data.copy';
import { TimelineMarkerGlyph } from './TimelineMarkerGlyph';
import { TIMELINE_DERIVED_PATTERN_ID } from './TimelineSpanBar';

export interface TimelineLegendProps {
  readonly className?: string;
}

export const TimelineLegend = (
  props: TimelineLegendProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className} data-testid="TimelineLegend">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="text-muted-foreground">
          {TIMELINE_LEGEND_COPY.spansHeading}
        </span>
        {TIMELINE_SPAN_KINDS.map((kind) => (
          <span className="flex items-center gap-1.5" key={kind}>
            <svg aria-hidden="true" height={10} width={18}>
              <rect
                className={TIMELINE_SPAN_FILL_CLASS[kind]}
                height={10}
                rx={2}
                width={18}
              />
            </svg>
            {TIMELINE_SPAN_KIND_LABEL[kind]}
          </span>
        ))}

        {/*
          The hatch has to be in the legend with its explanation. An unexplained
          pattern on a bar is worse than no pattern at all — the reader knows
          something is being signalled and cannot tell what.
        */}
        <span
          className="flex items-center gap-1.5"
          data-testid="TimelineLegendDerived"
          title={TIMELINE_DISCLOSURE_COPY.derivedEnd}
        >
          <svg aria-hidden="true" height={10} width={18}>
            <defs>
              <pattern
                height={6}
                id={`${TIMELINE_DERIVED_PATTERN_ID}-legend`}
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
            <rect className="fill-sky-500/70" height={10} rx={2} width={18} />
            <rect
              fill={`url(#${TIMELINE_DERIVED_PATTERN_ID}-legend)`}
              height={10}
              rx={2}
              width={18}
            />
          </svg>
          {TIMELINE_LEGEND_COPY.derivedLabel}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <span className="text-muted-foreground">
          {TIMELINE_LEGEND_COPY.markersHeading}
        </span>
        {TIMELINE_MARKER_KINDS.map((kind) => (
          <span className="flex items-center gap-1.5" key={kind}>
            {/* Same glyph function the chart draws from, so the two cannot
                describe different shapes. */}
            <svg
              aria-hidden="true"
              height={12}
              viewBox="-6 -6 12 12"
              width={12}
            >
              <TimelineMarkerGlyph kind={kind} radius={4} />
            </svg>
            {TIMELINE_MARKER_KIND_LABEL[kind]}
          </span>
        ))}
      </div>

      <p className="text-muted-foreground mt-3 text-xs">
        {TIMELINE_DISCLOSURE_COPY.derivedEnd}
      </p>
      <p className="text-muted-foreground text-xs">
        {TIMELINE_DISCLOSURE_COPY.grillingScope}
      </p>
      <p className="text-muted-foreground text-xs">
        {TIMELINE_DISCLOSURE_COPY.taskUpdated}
      </p>
      <p className="text-muted-foreground text-xs">
        {TIMELINE_DISCLOSURE_COPY.statusChange}
      </p>
    </div>
  );
};
