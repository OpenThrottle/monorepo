import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { TimelineMarkerKind } from '~/__generated__/graphql';
import {
  TIMELINE_DETAIL_COPY,
  TIMELINE_SPAN_TOOLTIP_COPY,
} from '~/routing/timeline/data/data.copy';
import {
  TIMELINE_FIXTURE_MARKERS,
  TIMELINE_FIXTURE_SPANS,
} from '~/routing/timeline/data/data.fixtures';
import type { TimelineSpan } from '~/routing/timeline/types';

import type { TimelineDetailPopoverProps } from '../TimelineDetailPopover';
import { TimelineDetailPopover } from '../TimelineDetailPopover';

const spanById = (id: string): TimelineSpan => {
  const span = TIMELINE_FIXTURE_SPANS.find((entry) => entry.id === id);
  if (span === undefined) throw new Error(`fixture span ${id} is missing`);

  return span;
};

const renderPopover = (
  overrides: Partial<TimelineDetailPopoverProps> = {},
): RenderResult => {
  const props: TimelineDetailPopoverProps = {
    cluster: null,
    onOpenChange: () => undefined,
    span: null,
    ...overrides,
  };
  const Component = () => {
    return <TimelineDetailPopover {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineDetailPopover Component', () => {
  test('should render nothing when nothing is selected', () => {
    const component = renderPopover();

    expect(component.queryByTestId('TimelineDetailPopover')).toBeNull();
  });

  test('should open with a span selected', () => {
    const component = renderPopover({ span: spanById('session-a') });

    expect(component.getByTestId('TimelineDetailPopover')).toBeInTheDocument();
  });

  test('should show start, end and duration for a span', () => {
    const component = renderPopover({ span: spanById('session-a') });

    expect(
      component.getByText(TIMELINE_DETAIL_COPY.startedLabel),
    ).toBeVisible();
    expect(component.getByText(TIMELINE_DETAIL_COPY.endedLabel)).toBeVisible();
    expect(
      component.getByText(TIMELINE_DETAIL_COPY.durationLabel),
    ).toBeVisible();
  });

  test('should disclose a derived end next to the duration it qualifies', () => {
    const component = renderPopover({ span: spanById('run-a') });

    expect(
      component.getByTestId('TimelineDetailPopoverDerived'),
    ).toHaveTextContent(TIMELINE_SPAN_TOOLTIP_COPY.derivedEnd);
  });

  test('should not claim a derived end for a measured span', () => {
    const component = renderPopover({ span: spanById('session-a') });

    expect(component.queryByTestId('TimelineDetailPopoverDerived')).toBeNull();
  });

  test('should deep link to the plan when the span has one', () => {
    const component = renderPopover({ span: spanById('run-a') });

    expect(
      component.getByRole('link', { name: TIMELINE_DETAIL_COPY.openPlan }),
    ).toHaveAttribute('href', '/plans/plan-1');
  });

  test('should omit the plan link for a subjectless span', () => {
    const component = renderPopover({ span: spanById('session-open') });

    expect(
      component.queryByRole('link', { name: TIMELINE_DETAIL_COPY.openPlan }),
    ).toBeNull();
  });

  test('should expand a cluster to its members', () => {
    const commits = TIMELINE_FIXTURE_MARKERS.filter(
      (marker) => marker.kind === TimelineMarkerKind.GitCommit,
    );

    const component = renderPopover({
      cluster: {
        at: commits[0]?.at ?? '',
        kind: TimelineMarkerKind.GitCommit,
        markers: commits,
      },
    });

    // Expanding the cluster is the whole point of collapsing it in the chart.
    expect(
      component.getAllByTestId('TimelineDetailPopoverMarker'),
    ).toHaveLength(commits.length);
  });

  test('should link a pull request marker to its external URL', () => {
    const pr = TIMELINE_FIXTURE_MARKERS.find(
      (marker) => marker.kind === TimelineMarkerKind.PullRequest,
    );
    if (pr === undefined) throw new Error('fixture pull request is missing');

    const component = renderPopover({
      cluster: {
        at: pr.at,
        kind: TimelineMarkerKind.PullRequest,
        markers: [pr],
      },
    });

    expect(
      component.getByRole('link', {
        name: TIMELINE_DETAIL_COPY.openPullRequest,
      }),
    ).toHaveAttribute('href', pr.url);
  });
});
