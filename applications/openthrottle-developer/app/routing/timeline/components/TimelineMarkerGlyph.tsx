import * as React from 'react';
import clsx from 'clsx';
import {
  TIMELINE_MARKER_FILL_CLASS,
  TIMELINE_MARKER_KIND_LABEL,
} from '~/routing/timeline/config/kinds';
import { markerKindPath } from '~/routing/timeline/utils/marker-glyph-path';
import type { TimelineMarkerKind } from '~/routing/timeline/config/kinds';

export interface TimelineMarkerGlyphProps {
  readonly className?: string;
  /** Rendered as a count badge when a cluster holds more than one marker. */
  readonly count?: number;
  readonly kind: TimelineMarkerKind;
  readonly radius: number;
  readonly x?: number;
  readonly y?: number;
}

export const TimelineMarkerGlyph = (
  props: TimelineMarkerGlyphProps,
): React.ReactElement => {
  const { className, count = 1, kind, radius, x = 0, y = 0 } = props;

  // Hooks

  // Setup
  const isCluster = count > 1;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <g
      data-count={count}
      data-kind={kind}
      data-testid="TimelineMarkerGlyph"
      transform={`translate(${x}, ${y})`}
    >
      <path
        className={clsx(TIMELINE_MARKER_FILL_CLASS[kind], className)}
        d={markerKindPath(kind, radius)}
      />
      {/*
        A cluster keeps its kind's shape and gains a count, rather than becoming
        a generic dot — the shape is what tells you what collapsed in there.
      */}
      {isCluster ? (
        <text
          className="fill-foreground text-[8px] font-medium"
          data-testid="TimelineMarkerGlyphCount"
          textAnchor="middle"
          x={0}
          y={-radius - 2}
        >
          {count}
        </text>
      ) : null}
      <title>
        {isCluster
          ? `${count} × ${TIMELINE_MARKER_KIND_LABEL[kind]}`
          : TIMELINE_MARKER_KIND_LABEL[kind]}
      </title>
    </g>
  );
};
