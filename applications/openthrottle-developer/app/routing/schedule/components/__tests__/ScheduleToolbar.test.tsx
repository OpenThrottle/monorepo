import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleToolbar } from '../ScheduleToolbar';
import type { ScheduleToolbarProps } from '../ScheduleToolbar';

describe('ScheduleToolbar Component', () => {
  let component: RenderResult;
  let props: ScheduleToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ScheduleToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ScheduleToolbar')).toBeInTheDocument();
  });
});
