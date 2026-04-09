import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowConfigExecution } from '../PlanWorkflowConfigExecution';
import type { PlanWorkflowConfigExecutionProps } from '../PlanWorkflowConfigExecution';

describe('PlanWorkflowConfigExecution Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigExecutionProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanWorkflowConfigExecution {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render Layer 2 execution backend stub (disabled fieldset and runner)', () => {
    expect(
      component.getByTestId('PlanWorkflowConfigExecution'),
    ).toBeInTheDocument();
    const group = component.getByRole('group', {
      name: 'Layer 2 — Execution backend',
    });
    expect(group).toBeDisabled();
    expect(group).toHaveTextContent('Which runner executes each iteration');
    expect(
      component.getByRole('combobox', { name: 'Execution backend (stub)' }),
    ).toBeDisabled();
  });
});
