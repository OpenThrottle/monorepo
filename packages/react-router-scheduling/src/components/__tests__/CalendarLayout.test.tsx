import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as useScheduleModule from '../../hooks/useSchedule';
import type { UseScheduleResult } from '../../hooks/useSchedule';
import { CalendarView } from '../../types';
import { CalendarLayout } from '../CalendarLayout';

const events = [
  {
    end: '2026-06-15T11:00:00.000Z',
    id: 'a',
    start: '2026-06-15T10:00:00.000Z',
    title: 'Standup',
  },
];

// Schedule-X renders its own (CSS-hidden) header controls, so scope toolbar
// queries to the layout's own toolbar to avoid colliding with them.
function toolbarOf(container: HTMLElement) {
  const toolbar = container.querySelector<HTMLElement>(
    '.sx-scheduling-toolbar',
  );
  if (toolbar === null) {
    throw new Error('CalendarLayout toolbar not found');
  }
  return within(toolbar);
}

describe('CalendarLayout', () => {
  it('renders the toolbar, view toggles, and the calendar', () => {
    const component = render(
      <CalendarLayout defaultDate={new Date(2026, 5, 15)} events={events} />,
    );
    const toolbar = toolbarOf(component.container);

    expect(toolbar.getByRole('button', { name: 'Go to today' })).toBeDefined();
    expect(toolbar.getByText('Week')).toBeDefined();
    expect(toolbar.getByText('Month')).toBeDefined();
    expect(
      component.container.querySelector('.sx-react-calendar-wrapper'),
    ).not.toBeNull();
  });

  it('exposes accessible names on the toolbar, region, and view group', () => {
    const component = render(
      <CalendarLayout defaultDate={new Date(2026, 5, 15)} events={events} />,
    );
    const toolbar = toolbarOf(component.container);

    expect(
      toolbar.getByRole('button', { name: 'Previous period' }),
    ).toBeDefined();
    expect(toolbar.getByRole('button', { name: 'Next period' })).toBeDefined();
    // A single-select ToggleGroup exposes `role="radiogroup"` (Radix maps
    // `type="single"` to radio semantics).
    expect(
      toolbar.getByRole('radiogroup', { name: 'Calendar view' }),
    ).toBeDefined();
    expect(
      within(component.container).getByRole('group', { name: 'Calendar' }),
    ).toBeDefined();
  });

  it('marks the layout root as a group and renders an aria-live date label', () => {
    const component = render(
      <CalendarLayout defaultDate={new Date(2026, 5, 15)} events={events} />,
    );

    const root = within(component.container).getByRole('group', {
      name: 'Calendar',
    });
    // The layout root is the labelled group region.
    expect(root.getAttribute('role')).toBe('group');

    // The current-period label is a polite live region so screen readers
    // announce navigation (prev/next/today) without stealing focus.
    const toolbar = component.container.querySelector<HTMLElement>(
      '.sx-scheduling-toolbar',
    );
    const liveRegion = toolbar?.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion?.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it('updates the aria-live date label when navigating periods', async () => {
    const user = userEvent.setup();
    const component = render(
      <CalendarLayout defaultDate={new Date(2026, 5, 15)} events={events} />,
    );
    const toolbar = toolbarOf(component.container);
    const liveRegion = component.container.querySelector<HTMLElement>(
      '.sx-scheduling-toolbar [aria-live="polite"]',
    );
    const before = liveRegion?.textContent;

    await user.click(toolbar.getByRole('button', { name: 'Next period' }));

    expect(liveRegion?.textContent).not.toBe(before);
  });

  it('switches the active view from the toggle group', async () => {
    const user = userEvent.setup();
    const component = render(
      <CalendarLayout
        defaultDate={new Date(2026, 5, 15)}
        events={events}
        views={[CalendarView.Week, CalendarView.Month]}
      />,
    );
    const toolbar = toolbarOf(component.container);

    const monthToggle = toolbar.getByText('Month');
    await user.click(monthToggle);

    expect(monthToggle.closest('[data-state="on"]')).not.toBeNull();
  });

  it('renders only the enabled views', () => {
    const component = render(
      <CalendarLayout
        defaultDate={new Date(2026, 5, 15)}
        events={events}
        views={[CalendarView.Day]}
      />,
    );
    const toolbar = toolbarOf(component.container);

    expect(toolbar.getByText('Day')).toBeDefined();
    expect(toolbar.queryByText('Month')).toBeNull();
  });

  // Schedule-X renders no event geometry under jsdom, so assert against the
  // engine-agnostic events-service store the real `useSchedule` exposes (pure
  // JS state) by capturing the instance the layout creates.
  it('replaces the store events when a new events reference is passed', () => {
    let captured: UseScheduleResult | undefined;
    const real = useScheduleModule.useSchedule;
    vi.spyOn(useScheduleModule, 'useSchedule').mockImplementation((config) => {
      captured = real(config);
      return captured;
    });

    const next = [
      {
        end: '2026-06-15T13:00:00.000Z',
        id: 'b',
        start: '2026-06-15T12:00:00.000Z',
        title: 'Lunch',
      },
    ];

    const component = render(
      <CalendarLayout
        defaultDate={new Date(2026, 5, 15)}
        events={events}
        views={[CalendarView.Week]}
      />,
    );

    expect(captured?.all().map((e) => e.id)).toEqual(['a']);

    // A re-render with the SAME reference must not touch the store.
    component.rerender(
      <CalendarLayout
        defaultDate={new Date(2026, 5, 15)}
        events={events}
        views={[CalendarView.Week]}
      />,
    );
    expect(captured?.all().map((e) => e.id)).toEqual(['a']);

    // A new reference replaces the events without recreating the instance.
    const instanceBefore = captured?.instance;
    component.rerender(
      <CalendarLayout
        defaultDate={new Date(2026, 5, 15)}
        events={next}
        views={[CalendarView.Week]}
      />,
    );
    expect(captured?.all().map((e) => e.id)).toEqual(['b']);
    expect(captured?.instance).toBe(instanceBefore);

    vi.restoreAllMocks();
  });
});
