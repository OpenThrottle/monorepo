import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarTable } from '../CalendarTable';
import type { CalendarTableProps } from '../CalendarTable';
import { CALENDAR_EVENTS } from '~/routing/calendar/data/data.events';

describe('CalendarTable Component', () => {
  let component: RenderResult;
  let props: CalendarTableProps;

  beforeEach(() => {
    props = { events: CALENDAR_EVENTS };

    const Component = () => <CalendarTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('CalendarTable')).toBeInTheDocument();
  });

  test('should render a link for each event', () => {
    expect(
      component.getAllByRole('link', { name: 'View event: Team Standup' })
        .length,
    ).toBeGreaterThan(0);
  });
});
