import * as React from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';
import {
  TIMELINE_MARKER_KIND_LABEL,
  TIMELINE_MARKER_KINDS,
  TIMELINE_SPAN_KIND_LABEL,
  TIMELINE_SPAN_KINDS,
} from '~/routing/timeline/config/kinds';
import { TIMELINE_CONTROLS_COPY } from '~/routing/timeline/data/data.copy';
import { TIMELINE_SEARCH_PARAM } from '~/routing/timeline/config/defaults';
import { withTimelineKinds } from '~/routing/timeline/utils/search-params';
import { TimelineMarkerGlyph } from './TimelineMarkerGlyph';
export interface TimelineKindTogglesProps {
  readonly selectedMarkerKinds: readonly string[] | null;
  readonly selectedSpanKinds: readonly string[] | null;
}

export const TimelineKindToggles = (
  props: TimelineKindTogglesProps,
): React.ReactElement => {
  const { selectedMarkerKinds, selectedSpanKinds } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const activeSpans = selectedSpanKinds ?? TIMELINE_SPAN_KINDS;
  const activeMarkers = selectedMarkerKinds ?? TIMELINE_MARKER_KINDS;

  // Handlers
  //
  // ToggleGroup hands back the full next selection, so the allowlist is written
  // straight through rather than diffed. `withTimelineKinds` is what preserves
  // the three distinct states — every kind, some kinds, and none.
  const handleSpanChange = (next: string[]): void => {
    setSearchParams(
      withTimelineKinds(
        searchParams,
        TIMELINE_SEARCH_PARAM.spanKinds,
        next,
        TIMELINE_SPAN_KINDS,
      ),
    );
  };

  const handleMarkerChange = (next: string[]): void => {
    setSearchParams(
      withTimelineKinds(
        searchParams,
        TIMELINE_SEARCH_PARAM.markerKinds,
        next,
        TIMELINE_MARKER_KINDS,
      ),
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center gap-1"
      data-testid="TimelineKindToggles"
    >
      <span className="text-muted-foreground mr-1 text-xs">
        {TIMELINE_CONTROLS_COPY.kindsLabel}
      </span>
      <ToggleGroup
        aria-label="Span kinds"
        onValueChange={handleSpanChange}
        size="sm"
        type="multiple"
        value={[...activeSpans]}
        variant="outline"
      >
        {TIMELINE_SPAN_KINDS.map((kind) => (
          <ToggleGroupItem key={kind} value={kind}>
            {TIMELINE_SPAN_KIND_LABEL[kind]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ToggleGroup
        aria-label="Marker kinds"
        onValueChange={handleMarkerChange}
        size="sm"
        type="multiple"
        value={[...activeMarkers]}
        variant="outline"
      >
        {TIMELINE_MARKER_KINDS.map((kind) => (
          <ToggleGroupItem className="gap-1.5" key={kind} value={kind}>
            {/* The glyph, not a swatch — the toggle and the chart must read as
                the same vocabulary. */}
            <svg
              aria-hidden="true"
              height={12}
              viewBox="-6 -6 12 12"
              width={12}
            >
              <TimelineMarkerGlyph kind={kind} radius={4} />
            </svg>
            {TIMELINE_MARKER_KIND_LABEL[kind]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
