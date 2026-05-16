import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardStatCard } from '../DashboardStatCard';
import type { DashboardStatCardProps } from '../DashboardStatCard';

function renderWithProps(props: DashboardStatCardProps): RenderResult {
  const Component = () => <DashboardStatCard {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardStatCard Component', () => {
  let component: RenderResult;
  let props: DashboardStatCardProps;

  beforeEach(() => {
    props = {
      description: 'A test description',
      heading: 'A test heading',
    };
    component = renderWithProps(props);
  });

  test('renders heading and description', () => {
    expect(component.getByTestId('DashboardStatCard')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'A test heading' }),
    ).toBeInTheDocument();
    expect(component.getByText('A test description')).toBeInTheDocument();
  });
});
