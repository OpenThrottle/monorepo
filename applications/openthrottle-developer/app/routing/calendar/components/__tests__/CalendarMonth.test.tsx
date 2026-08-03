import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CALENDAR_DEMO_EVENTS } from '../../data/data.calendar-demo';
import { CalendarMonth } from '../CalendarMonth';

describe('CalendarMonth', () => {
  it('mounts the calendar and shows the click-to-create prompt', () => {
    const component = render(<CalendarMonth events={CALENDAR_DEMO_EVENTS} />);

    expect(
      component.getByText(/click an empty time slot to create an event/i),
    ).toBeDefined();
    expect(
      component.container.querySelector('.sx-react-calendar-wrapper'),
    ).not.toBeNull();
  });
});
