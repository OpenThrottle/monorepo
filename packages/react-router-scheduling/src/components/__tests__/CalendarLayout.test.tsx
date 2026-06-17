import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

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

    expect(toolbar.getByRole('button', { name: 'Today' })).toBeDefined();
    expect(toolbar.getByText('Week')).toBeDefined();
    expect(toolbar.getByText('Month')).toBeDefined();
    expect(
      component.container.querySelector('.sx-react-calendar-wrapper'),
    ).not.toBeNull();
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
});
