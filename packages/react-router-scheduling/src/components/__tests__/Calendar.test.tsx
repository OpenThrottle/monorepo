import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useSchedule } from '../../hooks/useSchedule';
import { CalendarView } from '../../types';
import { Calendar } from '../Calendar';
import type { CalendarSlots } from '../slots';

function Harness({
  className = 'demo-calendar',
  slots,
}: {
  className?: string;
  slots?: CalendarSlots;
}) {
  const schedule = useSchedule({
    events: [
      {
        end: '2026-06-15T11:00:00.000Z',
        id: 'a',
        start: '2026-06-15T10:00:00.000Z',
        title: 'Standup',
      },
    ],
    views: [CalendarView.Week, CalendarView.Month],
  });
  return (
    <Calendar
      className={className}
      height="600px"
      schedule={schedule}
      slots={slots}
    />
  );
}

describe('Calendar', () => {
  it('renders the calendar wrapper with explicit sizing', () => {
    const component = render(<Harness />);

    const wrapper =
      component.container.querySelector<HTMLElement>('.demo-calendar');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.height).toBe('600px');
  });

  it('mounts the Schedule-X calendar element', () => {
    const component = render(<Harness />);
    expect(
      component.container.querySelector('.sx-react-calendar-wrapper'),
    ).not.toBeNull();
  });

  it('mounts with custom event slots without error', () => {
    const component = render(
      <Harness
        slots={{
          timeGridEvent: ({ calendarEvent }) => (
            <div>{calendarEvent.title}</div>
          ),
        }}
      />,
    );
    expect(
      component.container.querySelector('.sx-react-calendar-wrapper'),
    ).not.toBeNull();
  });
});
