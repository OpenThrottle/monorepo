import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { CALENDAR_EVENTS } from '~/routing/calendar/data/data.events';

import type { CalendarEventDetailsProps } from '../CalendarEventDetails';
import { CalendarEventDetails } from '../CalendarEventDetails';

describe('CalendarEventDetails Component', () => {
  let component: RenderResult;
  let props: CalendarEventDetailsProps;

  beforeEach(() => {
    const [event] = CALENDAR_EVENTS;
    if (event === undefined) {
      throw new Error('expected a calendar event fixture');
    }

    props = { event };

    const Component = () => <CalendarEventDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('CalendarEventDetails')).toBeInTheDocument();
  });

  test('should render the event title', () => {
    expect(component.getByText('Team Standup')).toBeInTheDocument();
  });
});
