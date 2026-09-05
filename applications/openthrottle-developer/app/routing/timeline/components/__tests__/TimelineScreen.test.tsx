import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TimelineLaneGrouping } from '~/__generated__/graphql';
import {
  FIXTURE_WINDOW_FROM,
  FIXTURE_WINDOW_TO,
  TIMELINE_FIXTURE_MARKERS,
  TIMELINE_FIXTURE_SPANS,
} from '~/routing/timeline/data/data.fixtures';
import {
  TIMELINE_EMPTY_COPY,
  TIMELINE_PAGE_COPY,
} from '~/routing/timeline/data/data.copy';
import { TimelineScreen } from '../TimelineScreen';
import type { TimelineScreenProps } from '../TimelineScreen';

const baseProps = (
  overrides: Partial<TimelineScreenProps> = {},
): TimelineScreenProps => ({
  grouping: TimelineLaneGrouping.ByPlan,
  markers: TIMELINE_FIXTURE_MARKERS,
  selectedBranch: null,
  selectedMarkerKinds: null,
  selectedSpanKinds: null,
  spans: TIMELINE_FIXTURE_SPANS,
  truncation: [],
  windowFromIso: FIXTURE_WINDOW_FROM.toISOString(),
  windowPreset: '7d',
  windowToIso: FIXTURE_WINDOW_TO.toISOString(),
  ...overrides,
});

const renderScreen = (props: TimelineScreenProps): RenderResult => {
  const Component = () => <TimelineScreen {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineScreen Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderScreen(baseProps());
  });

  test('should render the component name', () => {
    expect(component.getByTestId('TimelineScreen')).toBeInTheDocument();
  });

  test('should render the beta badge alongside the title', () => {
    expect(component.getByText(TIMELINE_PAGE_COPY.betaBadge)).toBeVisible();
    expect(component.getByText(TIMELINE_PAGE_COPY.title)).toBeVisible();
  });

  test('should not render the empty state when the window has rows', () => {
    expect(component.queryByTestId('TimelineScreenEmpty')).toBeNull();
  });

  test('should render a real empty state when the window is empty', () => {
    const empty = renderScreen(baseProps({ markers: [], spans: [] }));

    expect(empty.getByTestId('TimelineScreenEmpty')).toBeInTheDocument();
    expect(empty.getByText(TIMELINE_EMPTY_COPY.title)).toBeVisible();
  });
});
