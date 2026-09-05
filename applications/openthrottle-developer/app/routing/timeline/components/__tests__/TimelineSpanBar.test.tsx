import * as React from 'react';
import { render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { TimelineSpanKind } from '~/__generated__/graphql';
import { TIMELINE_SPAN_TOOLTIP_COPY } from '~/routing/timeline/data/data.copy';
import { createTimelineScale } from '~/routing/timeline/utils/scale';
import { spanRect } from '~/routing/timeline/utils/span-geometry';
import { TimelineSpanBar } from '../TimelineSpanBar';
import type { TimelineSpan } from '~/routing/timeline/types';

const scale = createTimelineScale({
  from: new Date('2026-09-01T00:00:00Z'),
  to: new Date('2026-09-02T00:00:00Z'),
  width: 1440,
});

const span = (overrides: Partial<TimelineSpan> = {}): TimelineSpan => ({
  backend: 'claude',
  branch: null,
  checkoutId: null,
  conversationId: null,
  derivedEnd: false,
  endsAt: '2026-09-01T03:00:00Z',
  id: 'span-1',
  kind: TimelineSpanKind.PlanRun,
  laneKey: 'plan:plan-1',
  laneLabel: 'Plan One',
  model: 'claude-opus-5',
  planId: 'plan-1',
  startsAt: '2026-09-01T01:00:00Z',
  status: 'COMPLETED',
  title: 'A plan run',
  ...overrides,
});

const renderBar = (
  value: TimelineSpan,
  onSelect?: (selected: TimelineSpan) => void,
): RenderResult => {
  const Component = () => (
    <svg>
      <TimelineSpanBar
        onSelect={onSelect}
        rect={spanRect({ scale, span: value, subRow: 0 })}
        span={value}
      />
    </svg>
  );
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('TimelineSpanBar Component', () => {
  test('should render the bar', () => {
    const view = renderBar(span());

    expect(view.getByTestId('TimelineSpanBar')).toBeInTheDocument();
  });

  test('should describe the span, its window and its duration in the tooltip', () => {
    const view = renderBar(span());
    const label =
      view.getByTestId('TimelineSpanBar').getAttribute('aria-label') ?? '';

    expect(label).toContain('Plan run: A plan run');
    expect(label).toContain('2h 0m');
    expect(label).toContain('claude-opus-5');
  });

  test('should hatch a derived end and explain what it means', () => {
    const view = renderBar(span({ derivedEnd: true }));

    expect(
      within(view.container).getByTestId('TimelineSpanBarDerivedEnd'),
    ).toBeInTheDocument();
    expect(
      view.getByTestId('TimelineSpanBar').getAttribute('aria-label'),
    ).toContain(TIMELINE_SPAN_TOOLTIP_COPY.derivedEnd);
  });

  test('should not hatch a measured end', () => {
    const view = renderBar(span({ derivedEnd: false }));

    expect(
      within(view.container).queryByTestId('TimelineSpanBarDerivedEnd'),
    ).toBeNull();
  });

  test('should mark a span clipped by the window start', () => {
    const view = renderBar(span({ startsAt: '2026-08-30T00:00:00Z' }));

    expect(
      within(view.container).getByTestId('TimelineSpanBarClipStart'),
    ).toBeInTheDocument();
    expect(
      view.getByTestId('TimelineSpanBar').getAttribute('aria-label'),
    ).toContain(TIMELINE_SPAN_TOOLTIP_COPY.clippedStart);
  });

  test('should mark a span clipped by the window end', () => {
    const view = renderBar(span({ endsAt: '2026-09-03T00:00:00Z' }));

    expect(
      within(view.container).getByTestId('TimelineSpanBarClipEnd'),
    ).toBeInTheDocument();
  });

  test('should say when a bar was widened to stay clickable', () => {
    const view = renderBar(span({ endsAt: '2026-09-01T01:00:01Z' }));

    expect(view.getByTestId('TimelineSpanBar')).toHaveAttribute(
      'data-widened',
      'true',
    );
    expect(
      view.getByTestId('TimelineSpanBar').getAttribute('aria-label'),
    ).toContain(TIMELINE_SPAN_TOOLTIP_COPY.widened);
  });

  test('should call onSelect when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const value = span();
    const view = renderBar(value, onSelect);

    await user.click(view.getByTestId('TimelineSpanBar'));

    expect(onSelect).toHaveBeenCalledWith(value);
  });

  test('should be selectable from the keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const view = renderBar(span(), onSelect);

    view.getByTestId('TimelineSpanBar').focus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
