import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { DashboardToolbar } from '../DashboardToolbar';
import type { DashboardToolbarProps } from '../DashboardToolbar';

function renderWithProps(props: DashboardToolbarProps): RenderResult {
  const Component = () => <DashboardToolbar {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
}

describe('DashboardToolbar Component', () => {
  let component: RenderResult;

  beforeEach(() => {
    component = renderWithProps({});
  });

  test('renders toolbar region and title', () => {
    expect(component.getByTestId('DashboardToolbar')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { level: 2, name: 'DashboardToolbar' }),
    ).toBeInTheDocument();
  });
});
