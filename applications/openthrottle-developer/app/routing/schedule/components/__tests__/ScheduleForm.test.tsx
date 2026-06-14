import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { ScheduleForm } from '../ScheduleForm';
import type { ScheduleFormProps } from '../ScheduleForm';

describe('ScheduleForm Component', () => {
  let component: RenderResult;
  let props: ScheduleFormProps;

  beforeEach(() => {
    props = { action: 'create' };

    const Component = () => <ScheduleForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('ScheduleForm')).toBeInTheDocument();
  });

  test('should render the create submit button', () => {
    expect(
      component.getByRole('button', { name: 'Create event' }),
    ).toBeInTheDocument();
  });
});
