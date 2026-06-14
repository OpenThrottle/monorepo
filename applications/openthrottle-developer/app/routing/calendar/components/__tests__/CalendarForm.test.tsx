import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { CalendarForm } from '../CalendarForm';
import type { CalendarFormProps } from '../CalendarForm';

describe('CalendarForm Component', () => {
  let component: RenderResult;
  let props: CalendarFormProps;

  beforeEach(() => {
    props = { action: 'create' };

    const Component = () => <CalendarForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render the component name', () => {
    expect(component.getByTestId('CalendarForm')).toBeInTheDocument();
  });

  test('should render the create submit button', () => {
    expect(
      component.getByRole('button', { name: 'Create event' }),
    ).toBeInTheDocument();
  });
});
