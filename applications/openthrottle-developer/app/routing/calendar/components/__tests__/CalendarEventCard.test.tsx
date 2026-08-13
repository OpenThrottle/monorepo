import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarEventCard } from '../CalendarEventCard';
import type { CalendarEventCardProps } from '../CalendarEventCard';

describe('CalendarEventCard Component', () => {
  let component: RenderResult;
  let props: CalendarEventCardProps;

  beforeEach(() => {
    props = {
      calendarEvent: {
        end: '2026-08-12T10:00:00.000Z',
        id: 'event-1',
        location: 'Room 202',
        start: '2026-08-12T09:00:00.000Z',
        title: 'Team Standup',
      },
    };

    component = render(<CalendarEventCard {...props} />);
  });

  test('renders the event title', () => {
    expect(component.getByText('Team Standup')).toBeInTheDocument();
  });

  test('renders the start time and location', () => {
    expect(component.getByText(/Room 202/)).toBeInTheDocument();
  });

  test('omits the location separator when location is absent', () => {
    component.unmount();
    const noLocationProps: CalendarEventCardProps = {
      calendarEvent: {
        end: '2026-08-12T10:00:00.000Z',
        id: 'event-2',
        start: '2026-08-12T09:00:00.000Z',
        title: 'No Location Event',
      },
    };

    component = render(<CalendarEventCard {...noLocationProps} />);

    expect(component.getByText('No Location Event')).toBeInTheDocument();
    expect(component.queryByText(/·/)).not.toBeInTheDocument();
  });
});
