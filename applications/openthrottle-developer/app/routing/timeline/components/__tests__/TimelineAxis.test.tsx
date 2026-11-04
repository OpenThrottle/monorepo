import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createTimelineScale } from '~/routing/timeline/utils/scale';

import type { TimelineAxisProps } from '../TimelineAxis';
import { TimelineAxis } from '../TimelineAxis';

const renderAxis = (props: TimelineAxisProps): RenderResult => {
  const Component = () => {
    return <TimelineAxis {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

const pastScale = createTimelineScale({
  from: new Date('2026-01-01T00:00:00Z'),
  to: new Date('2026-01-08T00:00:00Z'),
  width: 700,
});

describe('TimelineAxis Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FIXED_NOW);
    component = renderAxis({ scale: pastScale });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should render the axis', () => {
    expect(component.getByTestId('TimelineAxis')).toBeInTheDocument();
  });

  test('should render a tick for every interval in the window', () => {
    expect(component.getAllByTestId('TimelineAxisTick').length).toBeGreaterThan(
      0,
    );
  });

  test('should name the viewer time zone in the accessible label', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    expect(component.getByTestId('TimelineAxis')).toHaveAttribute(
      'aria-label',
      `Time axis, times shown in ${zone}`,
    );
  });

  test('should omit the now line when the window is entirely in the past', () => {
    expect(component.queryByTestId('TimelineAxisNowLine')).toBeNull();
  });

  test('should draw the now line on a live window whose end has just passed', () => {
    // The regression this guards: the loader stamps the window end at request
    // time, so the present is always slightly past it by the time we paint.
    const live = renderAxis({
      isLiveWindow: true,
      scale: createTimelineScale({
        from: new Date(FIXED_NOW.getTime() - 60 * 60 * 1000),
        to: new Date(FIXED_NOW.getTime() - 90 * 1000),
        width: 700,
      }),
    });

    expect(live.getByTestId('TimelineAxisNowLine')).toBeInTheDocument();
  });

  test('should not draw a now line on a past window even when live-clamping is off', () => {
    const past = renderAxis({ scale: pastScale });

    expect(past.queryByTestId('TimelineAxisNowLine')).toBeNull();
  });

  test('should draw the now line when the window includes the present', () => {
    const current = renderAxis({
      scale: createTimelineScale({
        from: new Date(FIXED_NOW.getTime() - 60 * 60 * 1000),
        to: new Date(FIXED_NOW.getTime() + 60 * 60 * 1000),
        width: 700,
      }),
    });

    expect(current.getByTestId('TimelineAxisNowLine')).toBeInTheDocument();
  });
});
