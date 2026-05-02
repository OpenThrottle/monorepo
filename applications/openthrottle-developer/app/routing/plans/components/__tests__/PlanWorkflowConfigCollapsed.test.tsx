import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanWorkflowConfigCollapsed } from '../PlanWorkflowConfigCollapsed';
import type { PlanWorkflowConfigCollapsedProps } from '../PlanWorkflowConfigCollapsed';

describe('PlanWorkflowConfigCollapsed Component', () => {
  let component: RenderResult;
  let props: PlanWorkflowConfigCollapsedProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanWorkflowConfigCollapsed {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
