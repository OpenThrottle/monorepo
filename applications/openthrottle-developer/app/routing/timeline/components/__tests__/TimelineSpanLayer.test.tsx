import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { buildTimelineLanes } from '~/routing/timeline/utils/lanes';
import { createTimelineScale } from '~/routing/timeline/utils/scale';
import {
  FIXTURE_WINDOW_FROM,
  FIXTURE_WINDOW_TO,
  TIMELINE_FIXTURE_SPANS,
} from '~/routing/timeline/data/data.fixtures';
import { TimelineSpanLayer } from '../TimelineSpanLayer';
import type { TimelineLane } from '~/routing/timeline/types';

const scale = createTimelineScale({
  from: FIXTURE_WINDOW_FROM,
  to: FIXTURE_WINDOW_TO,
  width: 900,
});

const lanes = buildTimelineLanes({
  markers: [],
  scale,
  spans: TIMELINE_FIXTURE_SPANS,
});

const laneByKey = (key: string): TimelineLane => {
  const lane = lanes.find((entry) => entry.key === key);
  if (lane === undefined) throw new Error(`fixture lane ${key} is missing`);

  return lane;
};

const renderLayer = (lane: TimelineLane): RenderResult => {
  const Component = () => <TimelineSpanLayer lane={lane} scale={scale} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineSpanLayer Component', () => {
  test('should render one bar per span in the lane', () => {
    const lane = laneByKey('plan:plan-1');
    const view = renderLayer(lane);

    expect(
      within(view.container).getAllByTestId('TimelineSpanBar'),
    ).toHaveLength(lane.spans.length);
  });

  test('should stack the three overlapping fixture spans across sub-rows', () => {
    const lane = laneByKey('plan:plan-1');

    // Two plan runs and a session all in flight at once — the reading the
    // whole view exists to make possible.
    expect(lane.subRowCount).toBe(3);
  });

  test('should size the layer to the lane height', () => {
    const lane = laneByKey('plan:plan-1');
    const view = renderLayer(lane);

    expect(
      within(view.container).getByTestId('TimelineSpanLayer'),
    ).toHaveAttribute('height', String(lane.subRowCount * 28));
  });

  test('should define the derived-end hatch once for the whole lane', () => {
    const view = renderLayer(laneByKey('plan:plan-1'));

    expect(
      view.container.querySelectorAll('pattern#timeline-derived-hatch'),
    ).toHaveLength(1);
  });

  test('should render nothing for a lane that holds no spans', () => {
    const view = renderLayer({
      key: 'skills',
      label: 'Skills',
      markerClusters: [],
      spans: [],
      subRowCount: 1,
    });

    expect(
      within(view.container).queryAllByTestId('TimelineSpanBar'),
    ).toHaveLength(0);
  });
});
