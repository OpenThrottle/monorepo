import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasks } from '../PlanTasks';
import type { PlanTasksProps } from '../PlanTasks';

describe('PlanTasks Component', () => {
  let component: RenderResult;
  let props: PlanTasksProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTasks {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render placeholder shell', () => {
    expect(component.getByTestId('PlanTasks')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: /plantasks/i }),
    ).toBeInTheDocument();
  });
});
