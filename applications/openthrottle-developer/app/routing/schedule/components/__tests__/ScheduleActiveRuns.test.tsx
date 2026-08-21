import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ScheduleActiveRuns } from '../ScheduleActiveRuns';
import { scheduleInFlightRunFixture } from '~/testing/schedule-fixtures';
import { SCHEDULE_COPY } from '~/routing/schedule/data/data.copy';
import type { ScheduleInFlightRunFragment } from '~/__generated__/graphql';

const renderPanel = (
  runs: ScheduleInFlightRunFragment[],
  action?: () => unknown,
): RenderResult => {
  const Component = () => <ScheduleActiveRuns runs={runs} />;
  const RoutesStub = createRoutesStub([
    { Component, action: action ?? (() => ({})), path: '/' },
  ]);

  return render(<RoutesStub />);
};

describe('ScheduleActiveRuns Component', () => {
  test('renders nothing when nothing is in flight', () => {
    const component = renderPanel([]);

    expect(
      component.queryByTestId('ScheduleActiveRuns'),
    ).not.toBeInTheDocument();
  });

  test('labels each run with its schedule, linking to the job', () => {
    const component = renderPanel([scheduleInFlightRunFixture()]);

    expect(component.getByTestId('ScheduleActiveRuns')).toBeInTheDocument();
    expect(
      component.getByRole('link', { name: 'Nightly audit' }),
    ).toHaveAttribute('href', '/schedule/job-1');
    expect(component.getByText('running')).toBeInTheDocument();
    expect(component.getByText('claude · opus')).toBeInTheDocument();
  });

  test('falls back to the schedule id when the schedule has been deleted', () => {
    const component = renderPanel([scheduleInFlightRunFixture({ job: null })]);

    expect(component.getByRole('link', { name: 'job-1' })).toBeInTheDocument();
  });

  test('shows the waiting state for a queued run instead of a bogus elapsed time', () => {
    const component = renderPanel([
      scheduleInFlightRunFixture({ startedAt: null, status: 'queued' }),
    ]);

    expect(
      component.getByText(SCHEDULE_COPY.activeRunsQueued),
    ).toBeInTheDocument();
    expect(component.queryByText('—')).not.toBeInTheDocument();
  });

  test('disables cancel for a run whose cancellation was already requested', () => {
    const component = renderPanel([
      scheduleInFlightRunFixture({
        cancelRequestedAt: '2026-08-21T12:00:00.000Z',
      }),
    ]);

    expect(
      component.getByRole('button', {
        name: SCHEDULE_COPY.activeRunsCancelRequested,
      }),
    ).toBeDisabled();
  });

  test('submits the cancel intent for the clicked run through the route action', async () => {
    const user = userEvent.setup();
    const action = vi.fn(() => ({}));
    const component = renderPanel(
      [
        scheduleInFlightRunFixture(),
        scheduleInFlightRunFixture({ id: 'run-2' }),
      ],
      action,
    );

    const buttons = component.getAllByRole('button', {
      name: SCHEDULE_COPY.activeRunsCancel,
    });
    expect(buttons).toHaveLength(2);

    await user.click(buttons[1]!);

    expect(action).toHaveBeenCalledOnce();
  });

  describe('elapsed time', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-08-21T12:00:05.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('counts up from startedAt', () => {
      const component = renderPanel([
        scheduleInFlightRunFixture({
          startedAt: '2026-08-21T12:00:00.000Z',
        }),
      ]);

      expect(component.getByText('5s')).toBeInTheDocument();
    });
  });
});
