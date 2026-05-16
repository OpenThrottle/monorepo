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

  test('renders toolbar region and org/repo selectors', () => {
    expect(component.getByTestId('DashboardToolbar')).toBeInTheDocument();
    expect(component.getAllByRole('combobox')).toHaveLength(2);
    expect(component.getByText('openthrottle')).toBeInTheDocument();
    expect(component.getByText('monorepo')).toBeInTheDocument();
  });
});
