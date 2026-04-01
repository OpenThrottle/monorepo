import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTask } from '../PlanTask';
import type { PlanTaskProps } from '../PlanTask';

describe('PlanTask Component', () => {
  let component: RenderResult;
  let props: PlanTaskProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTask {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render placeholder shell', () => {
    expect(component.getByTestId('PlanTask')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /plantask/i }),
    ).toBeInTheDocument();
  });
});
