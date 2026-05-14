import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { PlanTasksToolbar } from '../PlanTasksToolbar';
import type { PlanTasksToolbarProps } from '../PlanTasksToolbar';

describe('PlanTasksToolbar Component', () => {
  let component: RenderResult;
  let props: PlanTasksToolbarProps;

  beforeEach(() => {
    props = {};

    const Component = () => <PlanTasksToolbar {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
