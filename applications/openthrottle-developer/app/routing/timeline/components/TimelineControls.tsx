import * as React from 'react';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { useSearchParams } from 'react-router';
import type { TimelineLaneGrouping } from '~/__generated__/graphql';
import {
  TIMELINE_GROUPINGS,
  TIMELINE_WINDOW_PRESETS,
  type TimelineWindowPreset,
} from '~/routing/timeline/config/defaults';
import {
  TIMELINE_CONTROLS_COPY,
  TIMELINE_GROUPING_LABELS,
  TIMELINE_WINDOW_LABELS,
} from '~/routing/timeline/data/data.copy';
import {
  formatTimelineTimestamp,
  timelineZoneLabel,
} from '~/routing/timeline/utils/formatters';
import {
  withTimelineGrouping,
  withTimelineWindow,
} from '~/routing/timeline/utils/search-params';
import { TimelineKindToggles } from './TimelineKindToggles';

export interface TimelineControlsProps {
  readonly grouping: TimelineLaneGrouping;
  readonly selectedMarkerKinds: readonly string[] | null;
  readonly selectedSpanKinds: readonly string[] | null;
  readonly windowFromIso: string;
  readonly windowPreset: TimelineWindowPreset;
  readonly windowToIso: string;
}

export const TimelineControls = (
  props: TimelineControlsProps,
): React.ReactElement => {
  const {
    grouping,
    selectedMarkerKinds,
    selectedSpanKinds,
    windowFromIso,
    windowPreset,
    windowToIso,
  } = props;

  // Hooks
  const [searchParams, setSearchParams] = useSearchParams();

  // Setup
  const range = `${formatTimelineTimestamp(windowFromIso)} – ${formatTimelineTimestamp(windowToIso)} (${timelineZoneLabel()})`;

  // Handlers
  //
  // Radix hands back a bare string and clears it when the active item is
  // re-clicked, so both handlers narrow through a predicate and ignore
  // anything unrecognised — re-clicking the current preset must not empty the
  // window.
  const handleWindowChange = (value: string): void => {
    const preset = TIMELINE_WINDOW_PRESETS.find((entry) => entry === value);
    if (preset === undefined) return;

    setSearchParams(withTimelineWindow(searchParams, preset));
  };

  const handleGroupingChange = (value: string): void => {
    const next = TIMELINE_GROUPINGS.find((entry) => entry === value);
    if (next === undefined) return;

    setSearchParams(withTimelineGrouping(searchParams, next));
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3"
      data-testid="TimelineControls"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {TIMELINE_CONTROLS_COPY.windowLabel}
        </span>
        <ToggleGroup
          aria-label={TIMELINE_CONTROLS_COPY.windowLabel}
          attached={true}
          onValueChange={handleWindowChange}
          size="sm"
          type="single"
          value={windowPreset}
          variant="outline"
        >
          {TIMELINE_WINDOW_PRESETS.map((preset) => (
            <ToggleGroupItem key={preset} value={preset}>
              {TIMELINE_WINDOW_LABELS[preset]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {TIMELINE_CONTROLS_COPY.groupingLabel}
        </span>
        <ToggleGroup
          aria-label={TIMELINE_CONTROLS_COPY.groupingLabel}
          attached={true}
          onValueChange={handleGroupingChange}
          size="sm"
          type="single"
          value={grouping}
          variant="outline"
        >
          {TIMELINE_GROUPINGS.map((value) => (
            <ToggleGroupItem key={value} value={value}>
              {TIMELINE_GROUPING_LABELS[value]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <TimelineKindToggles
        selectedMarkerKinds={selectedMarkerKinds}
        selectedSpanKinds={selectedSpanKinds}
      />

      <p
        className="text-muted-foreground w-full text-xs"
        data-testid="TimelineControlsRange"
      >
        {range}
      </p>
    </div>
  );
};
