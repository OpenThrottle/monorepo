import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardPlansByStatus } from '../DashboardPlansByStatus';
import type { DashboardPlansByStatusProps } from '../DashboardPlansByStatus';

describe('DashboardPlansByStatus Component', () => {
  let component: RenderResult;
  let props: DashboardPlansByStatusProps;

  beforeEach(() => {
    props = {};

    const Component = () => <DashboardPlansByStatus {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
