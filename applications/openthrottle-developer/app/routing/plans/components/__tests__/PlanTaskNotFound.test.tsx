import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  PLAN_TASK_NOT_FOUND_COPY,
  PlanTaskNotFound,
} from '../PlanTaskNotFound';
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
      component.getByRole('heading', { name: PLAN_TASK_NOT_FOUND_COPY.title }),
    ).toBeInTheDocument();
    expect(
      component.getByText(PLAN_TASK_NOT_FOUND_COPY.description),
    ).toBeInTheDocument();
  });
});
