import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleEmpty } from '../ScheduleEmpty';
import type { ScheduleEmptyProps } from '../ScheduleEmpty';

describe('ScheduleEmpty Component', () => {
  let component: RenderResult;
  let props: ScheduleEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <ScheduleEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ScheduleEmpty')).toBeInTheDocument();
  });
});
