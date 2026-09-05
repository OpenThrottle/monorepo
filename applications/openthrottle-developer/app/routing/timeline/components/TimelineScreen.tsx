import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ActivityIcon } from 'lucide-react';
import { Badge } from '@openthrottle/react-router-shadcn';
import {
  TIMELINE_EMPTY_COPY,
  TIMELINE_PAGE_COPY,
  TIMELINE_TRUNCATION_COPY,
} from '~/routing/timeline/data/data.copy';
import { TimelineChart } from './TimelineChart';
import { TimelineControls } from './TimelineControls';
import { TimelineDetailPopover } from './TimelineDetailPopover';
import { TimelineLegend } from './TimelineLegend';
import type {
  TimelineMarker,
  TimelineMarkerCluster,
  TimelineSpan,
  TimelineTruncation,
} from '~/routing/timeline/types';
import type { TimelineLaneGrouping } from '~/__generated__/graphql';
import type { TimelineWindowPreset } from '~/routing/timeline/config/defaults';

export interface TimelineScreenProps {
  readonly grouping: TimelineLaneGrouping;
  readonly markers: readonly TimelineMarker[];
  readonly selectedBranch: string | null;
  readonly selectedMarkerKinds: readonly string[] | null;
  readonly selectedSpanKinds: readonly string[] | null;
  readonly spans: readonly TimelineSpan[];
  readonly truncation: readonly TimelineTruncation[];
  readonly windowFromIso: string;
  readonly windowPreset: TimelineWindowPreset;
  readonly windowToIso: string;
}

export const TimelineScreen = (
  props: TimelineScreenProps,
): React.ReactElement => {
  const {
    grouping,
    markers,
    selectedBranch: _selectedBranch,
    selectedMarkerKinds,
    selectedSpanKinds,
    spans,
    truncation,
    windowFromIso,
    windowPreset,
    windowToIso,
  } = props;

  // Hooks
  const [selectedSpan, setSelectedSpan] = React.useState<TimelineSpan | null>(
    null,
  );
  const [selectedCluster, setSelectedCluster] =
    React.useState<TimelineMarkerCluster | null>(null);

  // Setup
  const isEmpty = spans.length === 0 && markers.length === 0;
  const truncatedKinds = truncation.filter((entry) => entry.truncated);

  // Handlers
  const handleSelectSpan = (span: TimelineSpan): void => {
    setSelectedCluster(null);
    setSelectedSpan(span);
  };

  const handleSelectCluster = (cluster: TimelineMarkerCluster): void => {
    setSelectedSpan(null);
    setSelectedCluster(cluster);
  };

  const handleCloseDetail = (open: boolean): void => {
    if (open) return;

    setSelectedCluster(null);
    setSelectedSpan(null);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="TimelineScreen">
      <div className="mb-4 flex items-center gap-2">
        <GlobalHeading
          heading="h1"
          icon={ActivityIcon}
          title={TIMELINE_PAGE_COPY.title}
        />
        <Badge variant="outline">{TIMELINE_PAGE_COPY.betaBadge}</Badge>
      </div>
      <p className="text-muted-foreground mb-6 text-sm">
        {TIMELINE_PAGE_COPY.subtitle}
      </p>

      <TimelineControls
        grouping={grouping}
        selectedMarkerKinds={selectedMarkerKinds}
        selectedSpanKinds={selectedSpanKinds}
        windowFromIso={windowFromIso}
        windowPreset={windowPreset}
        windowToIso={windowToIso}
      />

      {isEmpty ? (
        <div
          className="rounded-lg border border-dashed p-8 text-center"
          data-testid="TimelineScreenEmpty"
        >
          <p className="font-medium">{TIMELINE_EMPTY_COPY.title}</p>
          <p className="text-muted-foreground mt-2 text-sm">
            {TIMELINE_EMPTY_COPY.description}
          </p>
        </div>
      ) : (
        <TimelineChart
          // Every timeline window is built as "the last N hours up to now", so
          // the now line always belongs at the right edge.
          isLiveWindow={true}
          markers={markers}
          onSelectMarkerCluster={handleSelectCluster}
          onSelectSpan={handleSelectSpan}
          spans={spans}
          windowFromIso={windowFromIso}
          windowToIso={windowToIso}
        />
      )}

      {/* Truncation is stated, never implied: a capped lane must not read as a
          complete one. */}
      {truncatedKinds.length > 0 ? (
        <p
          className="text-muted-foreground mt-3 text-xs"
          data-testid="TimelineScreenTruncation"
        >
          {truncatedKinds.map((entry) => entry.kind).join(', ')}{' '}
          {TIMELINE_TRUNCATION_COPY.suffix}
        </p>
      ) : null}

      <TimelineLegend className="mt-6" />

      <TimelineDetailPopover
        cluster={selectedCluster}
        onOpenChange={handleCloseDetail}
        span={selectedSpan}
      />
    </div>
  );
};
