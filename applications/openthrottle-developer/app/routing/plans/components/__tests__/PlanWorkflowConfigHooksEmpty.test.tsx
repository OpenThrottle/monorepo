import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowConfigHooksEmpty } from '../PlanWorkflowConfigHooksEmpty';
import type { PlanWorkflowConfigHooksEmptyProps } from '../PlanWorkflowConfigHooksEmpty';

describe('PlanWorkflowConfigHooksEmpty Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigHooksEmptyProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanWorkflowConfigHooksEmpty {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
