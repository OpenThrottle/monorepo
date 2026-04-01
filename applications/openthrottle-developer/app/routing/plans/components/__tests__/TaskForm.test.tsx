import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TaskForm } from '../TaskForm';
import type { TaskFormProps } from '../TaskForm';

describe('TaskForm Component', () => {
  let component: RenderResult;
  let props: TaskFormProps;

  beforeEach(() => {
    props = { planId: 'plan-1' };

    const Component = () => <TaskForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render task form card', () => {
    expect(component.getByTestId('TaskForm')).toBeInTheDocument();
  });

  test('should have hidden planId input', () => {
    const input = component.getByDisplayValue('plan-1');
    expect(input).toHaveAttribute('name', 'planId');
    expect(input).toHaveAttribute('type', 'hidden');
  });
});
