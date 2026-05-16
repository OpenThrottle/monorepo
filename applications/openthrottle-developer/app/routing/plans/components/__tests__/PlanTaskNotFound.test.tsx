import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTaskNotFound } from '../PlanTaskNotFound';
import type { PlanTaskNotFoundProps } from '../PlanTaskNotFound';

describe('PlanTaskNotFound Component', () => {
  let component: RenderResult;
  let props: PlanTaskNotFoundProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTaskNotFound {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders empty state for missing task', () => {
    expect(
      component.getByRole('heading', { name: 'Task not found' }),
    ).toBeInTheDocument();
    expect(
      component.getByText('The task you are looking for does not exist.'),
    ).toBeInTheDocument();
  });
});
