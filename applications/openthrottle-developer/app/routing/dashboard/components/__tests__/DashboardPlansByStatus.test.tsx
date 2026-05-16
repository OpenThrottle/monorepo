import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardPlansByStatus } from '../DashboardPlansByStatus';
import type { DashboardPlansByStatusProps } from '../DashboardPlansByStatus';

function renderWithProps(props: DashboardPlansByStatusProps): RenderResult {
  const Component = () => <DashboardPlansByStatus {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardPlansByStatus Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderWithProps({});
  });

  test('renders section and title', () => {
    expect(component.getByTestId('DashboardPlansByStatus')).toBeInTheDocument();
    expect(
      component.getByRole('heading', {
        level: 2,
        name: 'DashboardPlansByStatus',
      }),
    ).toBeInTheDocument();
  });
});
