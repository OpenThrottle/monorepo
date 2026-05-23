import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowConfigHookActions } from '../PlanWorkflowConfigHookActions';
import type { PlanWorkflowConfigHookActionsProps } from '../PlanWorkflowConfigHookActions';

describe('PlanWorkflowConfigHookActions Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigHookActionsProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanWorkflowConfigHookActions {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
