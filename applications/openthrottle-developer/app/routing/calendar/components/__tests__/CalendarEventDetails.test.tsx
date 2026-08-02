import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarEventDetails } from '../CalendarEventDetails';
import type { CalendarEventDetailsProps } from '../CalendarEventDetails';
import { CALENDAR_EVENTS } from '~/routing/calendar/data/data.events';

describe('CalendarEventDetails Component', () => {
  let component: RenderResult;
  let props: CalendarEventDetailsProps;

  beforeEach(() => {
    props = { event: CALENDAR_EVENTS[0] };

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
