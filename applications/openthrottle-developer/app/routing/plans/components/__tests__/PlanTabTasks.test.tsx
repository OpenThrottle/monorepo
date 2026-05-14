import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTabTasks } from '../PlanTabTasks';
import type { PlanTabTasksProps } from '../PlanTabTasks';

describe('PlanTabTasks Component', () => {
  let component: RenderResult;
  let props: PlanTabTasksProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTabTasks {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
