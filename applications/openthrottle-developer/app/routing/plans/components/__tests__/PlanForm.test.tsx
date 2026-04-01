import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanForm } from '../PlanForm';
import type { PlanFormProps } from '../PlanForm';

describe('PlanForm Component', () => {
  let component: RenderResult;
  let props: PlanFormProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanForm {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render create form with title field and submit', () => {
    expect(component.getByTestId('PlanForm')).toBeInTheDocument();
    expect(component.getByLabelText('Title')).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: /create plan/i }),
    ).toBeInTheDocument();
  });
});
