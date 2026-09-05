import * as React from 'react';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
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
import { TimelineDetailPopover } from '../TimelineDetailPopover';
import type { TimelineDetailPopoverProps } from '../TimelineDetailPopover';
import type { TimelineSpan } from '~/routing/timeline/types';

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
  const Component = () => <TimelineDetailPopover {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineDetailPopover Component', () => {
  test('should render nothing when nothing is selected', () => {
    renderPopover();

    expect(screen.queryByTestId('TimelineDetailPopover')).toBeNull();
  });

  test('should open with a span selected', () => {
    renderPopover({ span: spanById('session-a') });

    expect(screen.getByTestId('TimelineDetailPopover')).toBeInTheDocument();
  });

  test('should show start, end and duration for a span', () => {
    renderPopover({ span: spanById('session-a') });

    expect(screen.getByText(TIMELINE_DETAIL_COPY.startedLabel)).toBeVisible();
    expect(screen.getByText(TIMELINE_DETAIL_COPY.endedLabel)).toBeVisible();
    expect(screen.getByText(TIMELINE_DETAIL_COPY.durationLabel)).toBeVisible();
  });

  test('should disclose a derived end next to the duration it qualifies', () => {
    renderPopover({ span: spanById('run-a') });

    expect(
      screen.getByTestId('TimelineDetailPopoverDerived'),
    ).toHaveTextContent(TIMELINE_SPAN_TOOLTIP_COPY.derivedEnd);
  });

  test('should not claim a derived end for a measured span', () => {
    renderPopover({ span: spanById('session-a') });

    expect(screen.queryByTestId('TimelineDetailPopoverDerived')).toBeNull();
  });

  test('should deep link to the plan when the span has one', () => {
    renderPopover({ span: spanById('run-a') });

    expect(
      screen.getByRole('link', { name: TIMELINE_DETAIL_COPY.openPlan }),
    ).toHaveAttribute('href', '/plans/plan-1');
  });

  test('should omit the plan link for a subjectless span', () => {
    renderPopover({ span: spanById('session-open') });

    expect(
      screen.queryByRole('link', { name: TIMELINE_DETAIL_COPY.openPlan }),
    ).toBeNull();
  });

  test('should expand a cluster to its members', () => {
    const commits = TIMELINE_FIXTURE_MARKERS.filter(
      (marker) => marker.kind === TimelineMarkerKind.GitCommit,
    );

    renderPopover({
      cluster: {
        at: commits[0]?.at ?? '',
        kind: TimelineMarkerKind.GitCommit,
        markers: commits,
      },
    });

    // Expanding the cluster is the whole point of collapsing it in the chart.
    expect(screen.getAllByTestId('TimelineDetailPopoverMarker')).toHaveLength(
      commits.length,
    );
  });

  test('should link a pull request marker to its external URL', () => {
    const pr = TIMELINE_FIXTURE_MARKERS.find(
      (marker) => marker.kind === TimelineMarkerKind.PullRequest,
    );
    if (pr === undefined) throw new Error('fixture pull request is missing');

    renderPopover({
      cluster: {
        at: pr.at,
        kind: TimelineMarkerKind.PullRequest,
        markers: [pr],
      },
    });

    expect(
      screen.getByRole('link', { name: TIMELINE_DETAIL_COPY.openPullRequest }),
    ).toHaveAttribute('href', pr.url);
  });
});
