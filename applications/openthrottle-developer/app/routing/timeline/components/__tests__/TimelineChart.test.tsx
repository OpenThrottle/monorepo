import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  FIXTURE_WINDOW_FROM,
  FIXTURE_WINDOW_TO,
  TIMELINE_FIXTURE_MARKERS,
  TIMELINE_FIXTURE_SPANS,
} from '~/routing/timeline/data/data.fixtures';
import { TimelineChart } from '../TimelineChart';
import type { TimelineChartProps } from '../TimelineChart';

const baseProps = (
  overrides: Partial<TimelineChartProps> = {},
): TimelineChartProps => ({
  markers: TIMELINE_FIXTURE_MARKERS,
  spans: TIMELINE_FIXTURE_SPANS,
  windowFromIso: FIXTURE_WINDOW_FROM.toISOString(),
  windowToIso: FIXTURE_WINDOW_TO.toISOString(),
  ...overrides,
});

const renderChart = (props: TimelineChartProps): RenderResult => {
  const Component = () => <TimelineChart {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineChart Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderChart(baseProps());
  });

  test('should render the chart frame', () => {
    expect(component.getByTestId('TimelineChart')).toBeInTheDocument();
  });

  test('should render one lane row per distinct lane key', () => {
    // The fixture spans four lanes: two plans, the shared unattributed lane,
    // the scheduled lane, plus the skills lane from the grilling marker.
    const laneKeys = new Set([
      ...TIMELINE_FIXTURE_SPANS.map((span) => span.laneKey),
      ...TIMELINE_FIXTURE_MARKERS.map((marker) => marker.laneKey),
    ]);

    expect(component.getAllByTestId('TimelineChartLane')).toHaveLength(
      laneKeys.size,
    );
  });

  test('should label every lane in the gutter', () => {
    expect(component.getAllByTestId('TimelineLaneGutterLane').length).toBe(
      component.getAllByTestId('TimelineChartLane').length,
    );
  });

  test('should own its horizontal overflow so the page never scrolls sideways', () => {
    expect(component.getByTestId('TimelineChartBody')).toHaveClass(
      'overflow-x-auto',
    );
  });

  test('should make the chart body keyboard reachable', () => {
    expect(component.getByTestId('TimelineChartBody')).toHaveAttribute(
      'tabindex',
      '0',
    );
  });

  test('should render nothing but the frame when there is no data', () => {
    const empty = renderChart(baseProps({ markers: [], spans: [] }));

    // Scoped to this render's own container: the suite's default render is
    // still mounted, and RTL's top-level queries would see its lanes too.
    expect(
      within(empty.container).queryAllByTestId('TimelineChartLane'),
    ).toHaveLength(0);
    expect(
      within(empty.container).getByTestId('TimelineChart'),
    ).toBeInTheDocument();
  });
});
