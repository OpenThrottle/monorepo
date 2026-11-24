import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import { getDefaultPlanRunOptions } from '~/routing/plans/utils/plan-run-options';

import type { PlanWorkflowConfigExecutionProps } from '../PlanWorkflowConfigExecution';
import { PlanWorkflowConfigExecution } from '../PlanWorkflowConfigExecution';

describe('PlanWorkflowConfigExecution Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigExecutionProps;

  beforeEach(() => {
    const input = getDefaultPlanRunOptions({
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    });
    props = {
      heading: '05. Life Cycle',
      input,
      setInput: () => {},
    };

    const Component = () => {
      return <PlanWorkflowConfigExecution {...props} />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render driver runner select', () => {
    const group = component.getByRole('group', {
      name: '05. Life Cycle',
    });
    expect(group).not.toBeDisabled();
    expect(group).toHaveTextContent('Agent CLI');
    expect(
      component.getByRole('combobox', {
        name: 'Driver for this plan run',
      }),
    ).not.toBeDisabled();
  });
});
