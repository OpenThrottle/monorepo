import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { TimelineMarkerKind } from '~/__generated__/graphql';
import { buildTimelineLanes } from '~/routing/timeline/utils/lanes';
import { createTimelineScale } from '~/routing/timeline/utils/scale';
import {
  FIXTURE_WINDOW_FROM,
  FIXTURE_WINDOW_TO,
  TIMELINE_FIXTURE_MARKERS,
} from '~/routing/timeline/data/data.fixtures';
import { TimelineMarkerLayer } from '../TimelineMarkerLayer';
import type {
  TimelineLane,
  TimelineMarkerCluster,
} from '~/routing/timeline/types';

const scale = createTimelineScale({
  from: FIXTURE_WINDOW_FROM,
  to: FIXTURE_WINDOW_TO,
  width: 900,
});

const lanes = buildTimelineLanes({
  markers: TIMELINE_FIXTURE_MARKERS,
  scale,
  spans: [],
});

const laneByKey = (key: string): TimelineLane => {
  const lane = lanes.find((entry) => entry.key === key);
  if (lane === undefined) throw new Error(`fixture lane ${key} is missing`);

  return lane;
};

const renderLayer = (
  lane: TimelineLane,
  onSelectCluster?: (cluster: TimelineMarkerCluster) => void,
): RenderResult => {
  const Component = () => (
    <TimelineMarkerLayer
      lane={lane}
      onSelectCluster={onSelectCluster}
      scale={scale}
    />
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineMarkerLayer Component', () => {
  test('should render the layer', () => {
    const view = renderLayer(laneByKey('plan:plan-1'));

    expect(
      within(view.container).getByTestId('TimelineMarkerLayer'),
    ).toBeInTheDocument();
  });

  test('should bucket the two colliding fixture commits into one cluster', () => {
    const lane = laneByKey('plan:plan-1');
    const commitClusters = lane.markerClusters.filter(
      (cluster) => cluster.kind === TimelineMarkerKind.GitCommit,
    );

    expect(commitClusters).toHaveLength(1);
    expect(commitClusters[0]?.markers).toHaveLength(2);
  });

  test('should keep a nearby pull request separate from the commit cluster', () => {
    // The PR lands within a minute of the commits but is a different kind —
    // merging them would make the glyph meaningless.
    const lane = laneByKey('plan:plan-1');
    const kinds = lane.markerClusters.map((cluster) => cluster.kind);

    expect(kinds).toContain(TimelineMarkerKind.PullRequest);
    expect(kinds).toContain(TimelineMarkerKind.GitCommit);
  });

  test('should render a glyph per cluster, not per marker', () => {
    const lane = laneByKey('plan:plan-1');
    const view = renderLayer(lane);

    expect(
      within(view.container).getAllByTestId('TimelineMarkerCluster'),
    ).toHaveLength(lane.markerClusters.length);
  });

  test('should render the grilling marker in the skills lane', () => {
    const lane = laneByKey('skills');
    const view = renderLayer(lane);

    expect(lane.markerClusters[0]?.kind).toBe(TimelineMarkerKind.Grilling);
    expect(
      within(view.container).getAllByTestId('TimelineMarkerCluster'),
    ).toHaveLength(1);
  });

  test('should call onSelectCluster when a glyph is clicked', async () => {
    const user = userEvent.setup();
    const onSelectCluster = vi.fn();
    const lane = laneByKey('skills');
    const view = renderLayer(lane, onSelectCluster);

    await user.click(
      within(view.container).getAllByTestId('TimelineMarkerCluster')[0] ??
        view.container,
    );

    expect(onSelectCluster).toHaveBeenCalledWith(lane.markerClusters[0]);
  });

  test('should let the span layer beneath stay clickable', () => {
    const view = renderLayer(laneByKey('plan:plan-1'));

    // The layer covers the whole lane, so it must not swallow pointer events
    // outside its own glyphs or every span becomes unclickable.
    expect(
      within(view.container).getByTestId('TimelineMarkerLayer'),
    ).toHaveClass('pointer-events-none');
  });

  test('should render nothing for a lane with no markers', () => {
    const view = renderLayer({
      key: 'empty',
      label: 'Empty',
      markerClusters: [],
      spans: [],
      subRowCount: 1,
    });

    expect(
      within(view.container).queryAllByTestId('TimelineMarkerCluster'),
    ).toHaveLength(0);
  });
});
