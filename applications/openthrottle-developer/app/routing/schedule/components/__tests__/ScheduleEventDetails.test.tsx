import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleEventDetails } from '../ScheduleEventDetails';
import type { ScheduleEventDetailsProps } from '../ScheduleEventDetails';
import { SCHEDULE_EVENTS } from '~/routing/schedule/data/data.events';

describe('ScheduleEventDetails Component', () => {
  let component: RenderResult;
  let props: ScheduleEventDetailsProps;

  beforeEach(() => {
    props = { event: SCHEDULE_EVENTS[0] };

    const Component = () => <ScheduleEventDetails {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ScheduleEventDetails')).toBeInTheDocument();
  });

  test('should render the event title', () => {
    expect(component.getByText('Team Standup')).toBeInTheDocument();
  });
});
