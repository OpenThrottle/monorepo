import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowConfigExecution } from '../PlanWorkflowConfigExecution';
import type { PlanWorkflowConfigExecutionProps } from '../PlanWorkflowConfigExecution';
import { getDefaultWorkflowRalphRunOptionsInput } from '~/routing/plans/utils/build-workflow-ralph-argv';

describe('PlanWorkflowConfigExecution Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigExecutionProps;

  beforeEach(() => {
    const input = getDefaultWorkflowRalphRunOptionsInput({
      planId: '0c2720a9-920f-4b16-865a-f803eb444e18',
    });
    props = {
      heading: '05. Life Cycle',
      input,
      setInput: () => {},
    };

    const Component = () => <PlanWorkflowConfigExecution {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render execution backend runner select', () => {
    const group = component.getByRole('group', {
      name: '05. Life Cycle',
    });
    expect(group).not.toBeDisabled();
    expect(group).toHaveTextContent('workflow-ralph');
    expect(
      component.getByRole('combobox', {
        name: 'Execution backend for this plan run',
      }),
    ).not.toBeDisabled();
  });
});
