import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardStats } from '../DashboardStats';
import type { DashboardStatsProps } from '../DashboardStats';

function renderWithProps(props: DashboardStatsProps): RenderResult {
  const Component = () => <DashboardStats {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardStats Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderWithProps({});
  });

  test('renders stat cards with titles and values', () => {
    expect(component.getByText('Total plans')).toBeInTheDocument();
    expect(component.getByText('12')).toBeInTheDocument();
    expect(component.getByText('Active tasks')).toBeInTheDocument();
    expect(component.getByText('3')).toBeInTheDocument();
    expect(component.getByText('Scheduled tasks')).toBeInTheDocument();
    expect(component.getByText('23')).toBeInTheDocument();
  });
});
