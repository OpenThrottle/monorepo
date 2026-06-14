import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleTable } from '../ScheduleTable';
import type { ScheduleTableProps } from '../ScheduleTable';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';

describe('ScheduleTable Component', () => {
  let component: RenderResult;
  let props: ScheduleTableProps;

  beforeEach(() => {
    props = { events: SCHEDULE_EVENTS };

    const Component = () => <ScheduleTable {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ScheduleTable')).toBeInTheDocument();
  });

  test('should render a link for each event', () => {
    expect(
      component.getAllByRole('link', { name: 'View event: Team Standup' })
        .length,
    ).toBeGreaterThan(0);
  });
});
